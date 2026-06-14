import React, { useEffect, useRef, useState } from 'react';
import { Bot, Trash2, Send } from 'lucide-react';
import { sendAiMessage, getAiHistory, deleteAiHistory } from '../../api/ai';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: vi });
  } catch {
    return '';
  }
}

export default function AiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setLoadingHistory(true);
    getAiHistory(0, 50)
      .then((res) => {
        const data = res.data;
        const msgs = Array.isArray(data) ? data : (data.content || []);
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
      createdDate: new Date().toISOString(),
      temp: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendAiMessage(trimmed);
      const reply = res.data;
      setMessages((prev) => [
        ...prev.filter((m) => !m.temp),
        { id: userMsg.id + '_user', role: 'user', content: trimmed, createdDate: userMsg.createdDate },
        reply,
      ]);
    } catch {
      toast.error('Không thể kết nối với AI');
      setMessages((prev) => prev.filter((m) => !m.temp));
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử chat AI?')) return;
    try {
      await deleteAiHistory();
      setMessages([]);
      toast.success('Đã xóa lịch sử');
    } catch {
      toast.error('Không thể xóa lịch sử');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Trợ lý AI</h3>
            <p className="text-xs text-gray-400">Luôn sẵn sàng hỗ trợ bạn</p>
          </div>
        </div>
        <button
          onClick={handleClearHistory}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
          title="Xóa lịch sử"
        >
          <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
              <Bot size={32} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">Xin chào! Tôi là trợ lý AI</h3>
            <p className="text-sm text-gray-400">Hỏi tôi bất cứ điều gì bạn cần!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-[#0068ff] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                }`}>
                  {msg.content}
                  <div className={`text-[10px] mt-1.5 ${isUser ? 'text-blue-100 text-right' : 'text-gray-400 text-right'}`}>
                    {formatTime(msg.createdDate)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi cho AI..."
            disabled={loading}
            rows={1}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 max-h-32 overflow-y-auto"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
              input.trim() && !loading
                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:opacity-90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
