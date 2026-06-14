import React from 'react';
import { Phone, PhoneOff, PhoneMissed, Video } from 'lucide-react';
import useAuthStore from '../../store/authStore';

/**
 * CallBubble — hiển thị lịch sử cuộc gọi trong luồng tin nhắn.
 *
 * Props:
 *   call: CallSessionDto {
 *     id, chatId,
 *     initiatorId, initiatorName, initiatorAvatar,
 *     receiverId, receiverName, receiverAvatar,
 *     callType: 'VOICE' | 'VIDEO',
 *     status:   'ENDED' | 'MISSED' | 'REJECTED',
 *     durationSec, startedAt
 *   }
 */
export default function CallBubble({ call }) {
  const { auth } = useAuthStore();
  const isMine = call.initiatorId === auth?.userId;

  const isVideo   = call.callType === 'VIDEO';
  const isMissed  = call.status === 'MISSED';
  const isRejected = call.status === 'REJECTED';

  // Icon và màu tuỳ trạng thái
  const Icon = isMissed || isRejected ? PhoneMissed : isVideo ? Video : Phone;
  const accentColor = isMissed || isRejected ? 'text-red-500' : 'text-green-600';
  const bgColor     = isMissed || isRejected ? 'bg-red-50' : 'bg-green-50';
  const borderColor = isMissed || isRejected ? 'border-red-100' : 'border-green-100';

  // Label
  const callTypeLabel = isVideo ? 'Gọi video' : 'Gọi thoại';
  let statusLabel;
  if (isMissed)    statusLabel = isMine ? 'Không có người trả lời' : 'Cuộc gọi nhỡ';
  else if (isRejected) statusLabel = isMine ? 'Bị từ chối' : 'Đã từ chối';
  else             statusLabel = formatDuration(call.durationSec);

  // Thời gian gọi
  const timeLabel = call.startedAt
    ? new Date(call.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-4 py-1`}>
      <div
        className={`
          flex items-center gap-2.5 px-4 py-2.5
          rounded-2xl border ${bgColor} ${borderColor}
          max-w-[220px] min-w-[160px]
          ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}
        `}
      >
        {/* Icon */}
        <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border ${borderColor}`}>
          <Icon size={16} className={accentColor} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{callTypeLabel}</p>
          <p className={`text-xs ${isMissed || isRejected ? 'text-red-500' : 'text-gray-500'} truncate`}>
            {statusLabel}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 flex-shrink-0 self-end">{timeLabel}</span>
      </div>
    </div>
  );
}

function formatDuration(sec) {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
