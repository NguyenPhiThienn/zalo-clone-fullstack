import { useEffect, useRef, useCallback } from 'react';
import wsService from '../services/websocket';
import useAuthStore from '../store/authStore';
import useCallStore from '../store/callStore';
import { getIceServers } from '../services/iceServers';
import { saveCallSession } from '../api/call';

const CALL_APP_DEST = '/app/call/signal';
// Dùng /topic/call/{userId} — đơn giản, không phụ thuộc user-destination routing của Spring

export function useCallManager() {
  const { auth } = useAuthStore();
  const {
    setIncomingCall,
    clearIncomingCall,
    setActiveCall,
    updateActiveCall,
    clearActiveCall,
    setLocalStream,
    setRemoteStream,
    activeCall,
    incomingCall,
  } = useCallStore();

  const pcRef                   = useRef(null);
  const localStreamRef          = useRef(null);
  const callStartTimeRef        = useRef(null);
  const activeCallRef           = useRef(activeCall);
  const incomingCallRef         = useRef(incomingCall);
  const handlePeerDisconnectRef = useRef(null);
  const handleSignalRef         = useRef(null); // stable ref → subscription không bị teardown

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // ------------------------------------------------------------------ //

  const sendSignal = useCallback((signal) => {
    console.log('[call] sending signal:', signal.type, '→', signal.targetUserId);
    wsService.publish(CALL_APP_DEST, signal);
  }, []);

  const cleanupPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const getLocalStream = useCallback(async (callType) => {
    const constraints = {
      audio: true,
      video: callType === 'VIDEO' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [setLocalStream]);

  const createPeerConnection = useCallback((signal) => {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const cur = activeCallRef.current || incomingCallRef.current;
      if (!cur) return;
      const peerId = cur.peerId || signal?.fromUserId;
      if (!peerId) return;
      sendSignal({
        type: 'ice-candidate',
        chatId: cur.chatId || signal?.chatId,
        targetUserId: peerId,
        candidate: JSON.stringify(event.candidate),
      });
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        callStartTimeRef.current = Date.now();
        updateActiveCall({ status: 'active', startedAt: callStartTimeRef.current });
      } else if (['disconnected', 'failed', 'closed'].includes(state)) {
        handlePeerDisconnectRef.current?.();
      }
    };

    return pc;
  }, [sendSignal, setRemoteStream, updateActiveCall]);

  const handlePeerDisconnect = useCallback(() => {
    const cur = activeCallRef.current;
    if (!cur) return;
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : null;
    if (cur.direction === 'outgoing') {
      saveCallSession({
        chatId:      cur.chatId,
        receiverId:  cur.peerId,
        callType:    cur.callType,
        status:      duration ? 'ENDED' : 'MISSED',
        durationSec: duration,
      }).catch(() => {});
    }
    cleanupPeer();
    clearActiveCall();
  }, [cleanupPeer, clearActiveCall]);

  useEffect(() => {
    handlePeerDisconnectRef.current = handlePeerDisconnect;
  }, [handlePeerDisconnect]);

  // ------------------------------------------------------------------ //

  const handleSignal = useCallback(async (signal) => {
    console.log('[call] received signal:', signal.type, 'from', signal.fromUserId);
    const { type } = signal;

    if (type === 'call-offer') {
      if (activeCallRef.current) {
        sendSignal({ type: 'call-reject', chatId: signal.chatId, targetUserId: signal.fromUserId, callType: signal.callType });
        return;
      }
      setIncomingCall(signal);
      return;
    }

    if (type === 'call-answer') {
      if (!pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
        updateActiveCall({ status: 'connecting' });
      } catch (err) {
        console.error('[call] setRemoteDescription answer failed', err);
      }
      return;
    }

    if (type === 'call-reject') {
      cleanupPeer();
      const cur = activeCallRef.current;
      if (cur && cur.direction === 'outgoing') {
        saveCallSession({ chatId: cur.chatId, receiverId: cur.peerId, callType: cur.callType, status: 'REJECTED', durationSec: null }).catch(() => {});
      }
      clearActiveCall();
      return;
    }

    if (type === 'call-cancel') {
      clearIncomingCall();
      cleanupPeer();
      return;
    }

    if (type === 'call-end') {
      cleanupPeer();
      clearActiveCall();
      return;
    }

    if (type === 'ice-candidate') {
      if (!pcRef.current || !signal.candidate) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(signal.candidate)));
      } catch (err) {
        console.warn('[call] addIceCandidate failed', err);
      }
    }
  }, [sendSignal, setIncomingCall, clearIncomingCall, updateActiveCall, cleanupPeer, clearActiveCall]);

  // Luôn cập nhật ref để wrapper bên dưới luôn gọi handler mới nhất
  // Dùng useLayoutEffect để sync trước khi effect subscribe chạy
  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  // Subscribe theo /topic/call/{userId} — cùng pattern với messages/group, không cần user-destination
  useEffect(() => {
    if (!auth?.userId) return;
    const dest = `/topic/call/${auth.userId}`;
    console.log('[call] subscribing to', dest);
    const stableHandler = (signal) => handleSignalRef.current?.(signal);
    wsService.subscribe(dest, stableHandler);
    return () => {
      console.log('[call] unsubscribing from', dest);
      wsService.unsubscribe(dest);
    };
  }, [auth?.userId]);

  // ------------------------------------------------------------------ //

  const startCall = useCallback(async ({ chatId, peerId, peerName, peerAvatar, callType }) => {
    try {
      const stream = await getLocalStream(callType);
      const pc = createPeerConnection(null);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setActiveCall({ chatId, peerId, peerName, peerAvatar, callType, direction: 'outgoing', status: 'ringing', startedAt: null });
      sendSignal({ type: 'call-offer', chatId, targetUserId: peerId, callType, sdp: offer.sdp });
    } catch (err) {
      console.error('[call] startCall failed', err);
      cleanupPeer();
    }
  }, [getLocalStream, createPeerConnection, setActiveCall, sendSignal, cleanupPeer]);

  const acceptCall = useCallback(async () => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    try {
      const stream = await getLocalStream(incoming.callType);
      const pc = createPeerConnection(incoming);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: incoming.sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      clearIncomingCall();
      setActiveCall({ chatId: incoming.chatId, peerId: incoming.fromUserId, peerName: incoming.fromUserName, peerAvatar: incoming.fromUserAvatar, callType: incoming.callType, direction: 'incoming', status: 'connecting', startedAt: null });
      sendSignal({ type: 'call-answer', chatId: incoming.chatId, targetUserId: incoming.fromUserId, callType: incoming.callType, sdp: answer.sdp });
    } catch (err) {
      console.error('[call] acceptCall failed', err);
      cleanupPeer();
      clearIncomingCall();
    }
  }, [getLocalStream, createPeerConnection, sendSignal, clearIncomingCall, setActiveCall, cleanupPeer]);

  const rejectCall = useCallback(() => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    sendSignal({ type: 'call-reject', chatId: incoming.chatId, targetUserId: incoming.fromUserId, callType: incoming.callType });
    clearIncomingCall();
  }, [sendSignal, clearIncomingCall]);

  const endCall = useCallback(() => {
    const cur = activeCallRef.current;
    if (!cur) return;
    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : null;
    sendSignal({ type: cur.status === 'ringing' ? 'call-cancel' : 'call-end', chatId: cur.chatId, targetUserId: cur.peerId, callType: cur.callType, durationSec: duration });
    if (cur.direction === 'outgoing') {
      saveCallSession({ chatId: cur.chatId, receiverId: cur.peerId, callType: cur.callType, status: cur.status === 'ringing' ? 'MISSED' : 'ENDED', durationSec: duration }).catch(() => {});
    }
    cleanupPeer();
    clearActiveCall();
    callStartTimeRef.current = null;
  }, [sendSignal, cleanupPeer, clearActiveCall]);

  return { startCall, acceptCall, rejectCall, endCall };
}
