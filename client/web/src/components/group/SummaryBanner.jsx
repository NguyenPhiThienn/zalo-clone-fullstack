import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { summarizeGroup } from '../../api/groupAi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * SummaryBanner — hiển thị khi user có nhiều tin nhắn chưa đọc
 *
 * Props:
 *   groupId     — UUID nhóm
 *   unreadCount — số tin nhắn chưa đọc
 *   since       — ISO string của lần cuối user mở nhóm
 *   onDismiss   — callback khi user đóng banner
 */
export default function SummaryBanner({ groupId, unreadCount, since, onDismiss }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(null);

  if (!unreadCount || unreadCount < 10 || !since) return null;

  const handleSummarize = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setExpanded(true);
    try {
      const res = await summarizeGroup(groupId, since);
      setData(res.data);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const sinceLabel = since
    ? format(new Date(since), 'HH:mm dd/MM', { locale: vi })
    : '';

  return (
    <div className="mx-3 mb-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} className="text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-700 font-medium truncate">
            {unreadCount} tin nhắn mới kể từ {sinceLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {status === 'idle' && (
            <button
              onClick={handleSummarize}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
            >
              Xem tóm tắt
            </button>
          )}
          {status !== 'idle' && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-6 h-6 flex items-center justify-center text-blue-500 hover:text-blue-700"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-blue-100 pt-2">
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-blue-500 py-1">
              <Loader2 size={14} className="animate-spin" />
              <span>Đang tạo tóm tắt...</span>
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm text-red-500">
              Không thể tạo tóm tắt lúc này.{' '}
              <button onClick={handleSummarize} className="underline">Thử lại</button>
            </p>
          )}

          {status === 'done' && data && (
            <div className="space-y-2">
              {/* Summary text */}
              <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                <span>📊 {data.messageCount} tin nhắn</span>
                {data.topSpeakers && data.topSpeakers.length > 0 && (
                  <span>💬 Nhiều nhất: {data.topSpeakers.slice(0, 2).join(', ')}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
