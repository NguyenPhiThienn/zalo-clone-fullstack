import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Minimize2 } from 'lucide-react';
import useCallStore from '../../store/callStore';

export default function VideoCallWindow({ onEndCall, onMinimize }) {
  const activeCall   = useCallStore((s) => s.activeCall);
  const localStream  = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const isMuted      = useCallStore((s) => s.isMuted);
  const isCameraOff  = useCallStore((s) => s.isCameraOff);
  const toggleMute   = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (activeCall?.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status, activeCall?.startedAt]);

  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  if (!activeCall) return null;

  const isVideo = activeCall.callType === 'VIDEO';

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const displayElapsed = activeCall.status === 'active' ? elapsed : 0;
  const statusText = {
    ringing:    'Đang gọi...',
    connecting: 'Đang kết nối...',
    active:     fmt(displayElapsed),
  }[activeCall.status] ?? '';

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col select-none"
      onMouseMove={resetHideTimer}
    >
      {isVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          {activeCall.peerAvatar ? (
            <img
              src={activeCall.peerAvatar}
              alt={activeCall.peerName}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center text-5xl font-bold text-white border-4 border-white/20">
              {activeCall.peerName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          {activeCall.status === 'active' && !isMuted && (
            <div className="flex gap-1 mt-6 h-8 items-end">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-green-400 rounded-full animate-pulse"
                  style={{ height: `${12 + (i % 3) * 8}px`, animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isVideo && (
        <div className="absolute top-4 right-4 w-32 h-20 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? 'invisible' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <VideoOff size={20} className="text-gray-400" />
            </div>
          )}
        </div>
      )}

      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-4 py-3 flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{activeCall.peerName}</p>
          <p className="text-white/70 text-xs">{statusText}</p>
        </div>
        <button
          onClick={onMinimize}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        >
          <Minimize2 size={15} />
        </button>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-8 pt-12 flex items-center justify-center gap-5 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${isMuted ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {isVideo && (
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${isCameraOff ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
          >
            {isCameraOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-lg"
        >
          <PhoneOff size={26} />
        </button>
      </div>
    </div>
  );
}
