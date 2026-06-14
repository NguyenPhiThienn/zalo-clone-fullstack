import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Send, MessageCircle, X, Check, CheckCheck, Loader } from 'lucide-react';
import { getMyChats, getChatDetail, startChat } from '../../api/chat';
import { getMessages, sendMessage, markSeen } from '../../api/message';
import { searchUsers } from '../../api/user';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import wsService from '../../services/websocket';
import Avatar from '../common/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: vi }); }
  catch { return ''; }
}

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function MessageStatus({ state }) {
  if (state === 'SEEN') return <CheckCheck size={12} className="text-blue-400" />;
  if (state === 'DELIVERED') return <CheckCheck size={12} className="text-gray-400" />;
  return <Check size={12} className="text-gray-400" />;
}

export default function AdminChatPanel({ initialUserId }) {
  const { auth } = useAuthStore();

  // ── Dùng chatStore (Zustand) — dedup + persist qua remount ──────────
  const {
    chats, setChats, updateChatLastMessage,
    messages, setMessages, addMessage, prependMessages,
    updateChatMessagesState, clearUnread,
  } = useChatStore();

  // ── Local state chỉ cho UI riêng của admin panel ────────────────────
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatDetail, setChatDetail]         = useState(null);
  const [loading, setLoading]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [page, setPage]                     = useState(0);
  const [hasMore, setHasMore]               = useState(true);
  const [input, setInput]                   = useState('');
  const [sending, setSending]               = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [showSearch, setShowSearch]         = useState(false);

  const messagesEndRef      = useRef(null);
  const scrollContainerRef  = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const inputRef            = useRef(null);

  const chatMessages = messages[selectedChatId] || [];

  // ── Load chat list 1 lần (store persist qua remount) ───────────────
  useEffect(() => {
    if (chats.length === 0) {
      getMyChats()
        .then((res) => setChats(res.data || []))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-open chat từ UserManagement "Nhắn tin" ─────────────────────
  // chats.length dependency: đảm bảo chạy lại sau getMyChats resolve
  useEffect(() => {
    if (!initialUserId || chats.length === 0) return;
    const existing = chats.find((c) => String(c.recipientId) === String(initialUserId));
    if (existing) {
      openChat(existing.id);
    } else {
      startChat(initialUserId)
        .then((res) => {
          const chat = res.data;
          // Dùng setChats của store → dedup tự động
          setChats((prev) => prev.find((c) => c.id === chat.id) ? prev : [chat, ...prev]);
          openChat(chat.id);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId, chats.length]);

  // ── Mở chat: fetch detail + messages ───────────────────────────────
  const openChat = useCallback((chatId) => {
    setSelectedChatId(chatId);
    setChatDetail(null);
    setPage(0);
    setHasMore(true);
    setLoading(true);

    getChatDetail(chatId)
      .then((res) => setChatDetail(res.data))
      .catch(() => {});

    getMessages(chatId, 0, 30)
      .then((res) => {
        const data    = res.data;
        const fetched = (Array.isArray(data) ? data : (data.content || [])).slice().reverse();
        setMessages(chatId, fetched);
        setHasMore((Array.isArray(data) ? data : (data.content || [])).length === 30);
        setTimeout(() => scrollToBottom(false), 80);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    markSeen(chatId).catch(() => {});
    clearUnread(chatId);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setMessages, clearUnread]);

  // ── WebSocket subscribe — cùng pattern ChatWindow ───────────────────
  useEffect(() => {
    if (!selectedChatId) return;

    wsService.subscribe(`/topic/chat/${selectedChatId}`, (event) => {
      // State broadcast (SEEN/DELIVERED) — không có id
      if (event.newState !== undefined && event.messageSenderId !== undefined && !event.id) {
        updateChatMessagesState(selectedChatId, event.newState, event.messageSenderId);
        return;
      }
      // Tin nhắn mới — store.addMessage tự dedup by id
      addMessage(selectedChatId, event);
      updateChatLastMessage(selectedChatId, event);
      if (String(event.senderId) !== String(auth?.userId)) {
        markSeen(selectedChatId).catch(() => {});
      }
    });

    return () => wsService.unsubscribe(`/topic/chat/${selectedChatId}`);
  }, [selectedChatId, auth?.userId, addMessage, updateChatLastMessage, updateChatMessagesState]);

  // ── Refetch khi WS reconnect ────────────────────────────────────────
  useEffect(() => {
    if (!selectedChatId) return;
    const refetch = () => {
      getMessages(selectedChatId, 0, 30)
        .then((res) => {
          const data    = res.data;
          const fetched = (Array.isArray(data) ? data : (data.content || [])).slice().reverse();
          // Merge: giữ WS-only messages mới hơn API
          const existing = useChatStore.getState().messages[selectedChatId] || [];
          const fetchedIds  = new Set(fetched.map((m) => m.id));
          const latestTime  = fetched.length > 0
            ? new Date(fetched[fetched.length - 1].createdDate || fetched[fetched.length - 1].createdAt).getTime()
            : 0;
          const wsOnly = existing.filter(
            (m) => !fetchedIds.has(m.id)
              && new Date(m.createdDate || m.createdAt).getTime() > latestTime
          );
          setMessages(selectedChatId, [...fetched, ...wsOnly]);
        })
        .catch(() => {});
    };
    wsService.onReconnect(refetch);
    return () => wsService.offReconnect(refetch);
  }, [selectedChatId, setMessages]);

  // ── Auto scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (nearBottom) scrollToBottom();
  }, [chatMessages.length]);

  const scrollToBottom = (smooth = true) =>
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });

  // ── Load thêm khi cuộn lên ──────────────────────────────────────────
  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container || loadingMore || !hasMore || !selectedChatId) return;
    if (container.scrollTop < 100) {
      setLoadingMore(true);
      prevScrollHeightRef.current = container.scrollHeight;
      const nextPage = page + 1;
      try {
        const res  = await getMessages(selectedChatId, nextPage, 30);
        const data = res.data;
        const msgs = (Array.isArray(data) ? data : (data.content || [])).slice().reverse();
        if (msgs.length === 0) {
          setHasMore(false);
        } else {
          prependMessages(selectedChatId, msgs);
          setPage(nextPage);
          setTimeout(() => {
            const newH = scrollContainerRef.current?.scrollHeight || 0;
            if (scrollContainerRef.current)
              scrollContainerRef.current.scrollTop = newH - prevScrollHeightRef.current;
          }, 50);
        }
      } catch {}
      setLoadingMore(false);
    }
  }, [selectedChatId, page, loadingMore, hasMore, prependMessages]);

  // ── Gửi tin — thêm từ API response (ChatWindow pattern) ─────────────
  const handleSend = async () => {
    if (!input.trim() || !selectedChatId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await sendMessage({ chatId: selectedChatId, content, type: 'TEXT' });
      addMessage(selectedChatId, res.data);          // store dedup by id
      updateChatLastMessage(selectedChatId, res.data);
      setTimeout(() => scrollToBottom(), 50);
    } catch {
      setInput(content);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Tìm kiếm user để bắt đầu chat mới ─────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(searchQuery);
        setSearchResults(res.data || []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartChat = async (user) => {
    try {
      const res  = await startChat(user.id);
      const chat = res.data;
      setChats((prev) => prev.find((c) => c.id === chat.id) ? prev : [chat, ...prev]);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      openChat(chat.id);
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-white">
      {/* Danh sách chat */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-800 text-sm flex-1">Tin nhắn hỗ trợ</h3>
            <button
              onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); setSearchResults([]); }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              title="Tìm user để nhắn tin"
            >
              {showSearch
                ? <X size={15} className="text-gray-500" />
                : <Search size={15} className="text-gray-500" />}
            </button>
          </div>

          {showSearch && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm user để nhắn tin..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-10 max-h-52 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={28} />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-xs">Chưa có cuộc trò chuyện nào</div>
          )}
          {chats.map((chat) => {
            const isActive = selectedChatId === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => openChat(chat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-3 transition-colors text-left ${
                  isActive ? 'bg-blue-50 border-r-2 border-[#0068ff]' : 'hover:bg-gray-50'
                }`}
              >
                <Avatar src={chat.avatarUrl} name={chat.chatName} size={38} online={chat.recipientOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-[#0068ff]' : 'text-gray-800'}`}>
                      {chat.chatName || 'Người dùng'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {chat.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cửa sổ chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedChatId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <MessageCircle size={48} className="text-gray-200" />
            <p className="text-sm">Chọn cuộc trò chuyện để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
              <Avatar
                src={chatDetail?.avatarUrl}
                name={chatDetail?.chatName}
                size={36}
                online={chatDetail?.recipientOnline}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {chatDetail?.chatName || '...'}
                </p>
                <p className="text-xs text-gray-400">
                  {chatDetail?.recipientOnline
                    ? 'Đang hoạt động'
                    : (chatDetail?.recipientLastSeenText || 'Offline')}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50"
            >
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader size={22} className="animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {chatMessages.map((msg) => {
                    const isMine = String(msg.senderId) === String(auth?.userId);
                    if (msg.recalled) {
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-400 italic px-3 py-1.5 bg-gray-100 rounded-xl">
                            Tin nhắn đã được thu hồi
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[65%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? 'bg-[#0068ff] text-white rounded-br-sm'
                              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
                          }`}>
                            {msg.content || (msg.type && msg.type !== 'TEXT' ? `[${msg.type}]` : '')}
                          </div>
                          <div className="flex items-center gap-1 px-1">
                            <span className="text-[10px] text-gray-400">
                              {formatMsgTime(msg.createdAt || msg.createdDate)}
                            </span>
                            {isMine && <MessageStatus state={msg.state} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn hỗ trợ..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0068ff] text-white hover:bg-blue-600 transition-colors disabled:opacity-40"
              >
                {sending ? <Loader size={15} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
