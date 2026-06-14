import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import useCallStore from '../../store/callStore';

/**
 * IncomingCallModal — popup xuất hiện khi có cuộc gọi đến.
 *
 * Props:
 *   onAccept() — gọi khi user nhấn trả lời
 *   onReject() — gọi khi user nhấn từ chối
 */
export default function IncomingCallModal({ onAccept, onReject }) {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const audioRef = useRef(null);

  // Phát ringtone khi modal hiện
  useEffect(() => {
    if (!incomingCall) return;
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audioRef.current = audio;
    audio.play().catch(() => {}); // ignore autoplay policy
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'VIDEO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-6 pt-8 pb-6 text-white text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-3">
            {incomingCall.fromUserAvatar ? (
              <img
                src={incomingCall.fromUserAvatar}
                alt={incomingCall.fromUserName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-4 border-white/30">
                {incomingCall.fromUserName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-4 border-white/40 animate-ping" />
          </div>

          <h2 className="text-lg font-semibold">{incomingCall.fromUserName}</h2>
          <p className="text-sm text-blue-100 mt-1 flex items-center justify-center gap-1.5">
            {isVideo ? <Video size={14} /> : <Phone size={14} />}
            {isVideo ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex divide-x divide-gray-100">
          <button
            onClick={onReject}
            className="flex-1 flex flex-col items-center gap-1.5 py-5 hover:bg-red-50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
              <PhoneOff size={22} className="text-red-500" />
            </div>
            <span className="text-xs text-gray-500">Từ chối</span>
          </button>

          <button
            onClick={onAccept}
            className="flex-1 flex flex-col items-center gap-1.5 py-5 hover:bg-green-50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
              {isVideo
                ? <Video size={22} className="text-green-500" />
                : <Phone size={22} className="text-green-500" />
              }
            </div>
            <span className="text-xs text-gray-500">Trả lời</span>
          </button>
        </div>
      </div>
    </div>
  );
}
