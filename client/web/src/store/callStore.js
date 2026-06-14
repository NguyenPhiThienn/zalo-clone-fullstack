import { create } from 'zustand';

/**
 * callStore — quản lý toàn bộ trạng thái của cuộc gọi hiện tại.
 *
 * activeCall:
 *   null  — không có cuộc gọi
 *   {
 *     chatId      : UUID,
 *     peerId      : UUID,       -- userId của người kia
 *     peerName    : string,
 *     peerAvatar  : string|null,
 *     callType    : 'VOICE' | 'VIDEO',
 *     direction   : 'outgoing' | 'incoming',
 *     status      : 'ringing' | 'connecting' | 'active',
 *     startedAt   : number,     -- Date.now() khi status → active
 *   }
 *
 * incomingCall:
 *   null — không có cuộc gọi đến
 *   { ...signal }  — CallSignalDto từ backend
 */
const useCallStore = create((set) => ({
  activeCall:    null,
  incomingCall:  null,
  localStream:   null,   // MediaStream
  remoteStream:  null,   // MediaStream
  isMuted:       false,
  isCameraOff:   false,
  isFullscreen:  false,

  setIncomingCall: (signal) => set({ incomingCall: signal }),
  clearIncomingCall: () => set({ incomingCall: null }),

  setActiveCall: (call) => set({ activeCall: call }),

  updateActiveCall: (updates) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...updates } : null,
    })),

  clearActiveCall: () =>
    set({
      activeCall:   null,
      localStream:  null,
      remoteStream: null,
      isMuted:      false,
      isCameraOff:  false,
      isFullscreen: false,
    }),

  setLocalStream:  (stream)  => set({ localStream: stream }),
  setRemoteStream: (stream)  => set({ remoteStream: stream }),

  toggleMute: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((t) => {
          t.enabled = state.isMuted; // flip: nếu đang muted thì bật lại
        });
      }
      return { isMuted: !state.isMuted };
    }),

  toggleCamera: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((t) => {
          t.enabled = state.isCameraOff; // flip
        });
      }
      return { isCameraOff: !state.isCameraOff };
    }),

  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
}));

export default useCallStore;
