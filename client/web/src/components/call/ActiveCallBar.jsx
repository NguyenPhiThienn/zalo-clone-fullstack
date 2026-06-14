import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, Maximize2 } from 'lucide-react';
import useCallStore from '../../store/callStore';

export default function ActiveCallBar({ onEndCall, onExpand }) {
  const activeCall = useCallStore((s) => s.activeCall);
  const isMuted    = useCallStore((s) => s.isMuted);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (activeCall?.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status, activeCall?.startedAt]);

  if (!activeCall) return null;

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

  const isVideo = activeCall.callType === 'VIDEO';

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-green-600 text-white px-4 py-2 flex items-center gap-3 shadow-lg">
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        {isVideo ? <Video size={14} /> : <Phone size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activeCall.peerName}</p>
        <p className="text-xs text-green-200">{statusText}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
        <button
          onClick={onExpand}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={onEndCall}
          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
}
