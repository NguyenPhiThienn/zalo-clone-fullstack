import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { getChatSmartReplies } from '../../api/chatAi';

/**
 * ChatSmartReplySuggestions — gợi ý 3 câu trả lời nhanh cho chat 1-1
 *
 * Props:
 *   chatId        — UUID cuộc trò chuyện
 *   latestMessage — tin nhắn mới nhất nhận được (không phải của mình)
 *   onSelect(text)— callback khi user chọn 1 suggestion
 *   inputValue    — giá trị hiện tại của input (để ẩn khi user đang gõ)
 */
export default function ChatSmartReplySuggestions({ chatId, latestMessage, onSelect, inputValue }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const lastMessageIdRef = useRef(null);

  // Tự động fetch khi có tin nhắn mới đến
  useEffect(() => {
    if (!latestMessage?.id) return;
    if (latestMessage.id === lastMessageIdRef.current) return;
    if (!latestMessage.content) return; // tin nhắn media / bot → bỏ qua

    lastMessageIdRef.current = latestMessage.id;
    setVisible(true);
    setLoading(true);
    setSuggestions([]);

    getChatSmartReplies(chatId)
      .then((res) => {
        setSuggestions(res.data?.suggestions || []);
      })
      .catch(() => {
        setSuggestions([]);
      })
      .finally(() => setLoading(false));
  }, [latestMessage?.id, chatId]);

  // Ẩn khi user bắt đầu gõ
  useEffect(() => {
    if (inputValue && inputValue.trim().length > 0) {
      setVisible(false);
    }
  }, [inputValue]);

  if (!visible) return null;
  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="px-3 pb-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Label */}
        <div className="flex items-center gap-1 text-[11px] text-blue-500 font-medium">
          <Sparkles size={11} />
          <span>Gợi ý:</span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            <span>Đang tạo gợi ý...</span>
          </div>
        )}

        {/* Suggestion chips */}
        {!loading &&
          suggestions.map((text, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(text);
                setVisible(false);
              }}
              className="text-xs bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 rounded-full px-3 py-1 transition-colors shadow-sm whitespace-nowrap"
            >
              {text}
            </button>
          ))}

        {/* Dismiss */}
        {!loading && (
          <button
            onClick={() => setVisible(false)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 ml-auto"
            title="Ẩn gợi ý"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
