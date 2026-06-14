import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, Info, ChevronLeft } from 'lucide-react';
import { getChatDetail } from '../../api/chat';
import { getMessages, sendMessage, uploadMedia, markSeen } from '../../api/message';
import { getCallHistory } from '../../api/call';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import useCallStore from '../../store/callStore';
import wsService from '../../services/websocket';
import Avatar from '../common/Avatar';
import MessageBubble from './MessageBubble';
import CallBubble from '../call/CallBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ChatInfoPanel from './ChatInfoPanel';
import ChatSmartReplySuggestions from './ChatSmartReplySuggestions';
import ChatSummaryBanner from './ChatSummaryBanner';
import toast from 'react-hot-toast';

const AI_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

export default function ChatWindow({ onStartCall }) {
  const { activeChatId, messages, typingUsers, setMessages, prependMessages, addMessage, updateChatLastMessage, updateChatMessagesState, updateChat, setActiveChatId, clearUnread, setTyping, setViewingProfileId } = useChatStore();
  const { auth } = useAuthStore();

  // ─── AI state ─────────────────────────────────────────────────────────────
  const [latestIncomingMsg, setLatestIncomingMsg] = useState(null);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);
  const [lastVisitAt, setLastVisitAt] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const subscribeToChat = (chatId) => {
    // Subscribe to message delivery topic (broadcast, same pattern as group messages)
    wsService.subscribe(`/topic/chat/${chatId}`, (event) => {
      // State change broadcast từ backend (seen/delivered) — không phải tin nhắn mới
      if (event.newState !== undefined && event.messageSenderId !== undefined && !event.id) {
        updateChatMessagesState(chatId, event.newState, event.messageSenderId);
        return;
      }
      addMessage(chatId, event);
      updateChatLastMessage(chatId, event);
      // Chat đang mở, nhận message từ người khác → mark seen ngay để sender cập nhật real-time
      if (event.senderId !== auth?.userId) {
        markSeen(chatId).catch(() => {});
        // Smart Reply: chỉ trigger cho tin nhắn TEXT từ người thật (không phải bot)
        if (event.type === 'TEXT' && event.senderId?.toString() !== AI_BOT_USER_ID) {
          setLatestIncomingMsg(event);
        }
      }
    });
    // Subscribe to typing indicator
    wsService.subscribe(`/topic/chat/${chatId}/typing`, (data) => {
      const { userId, isTyping } = data;
      if (userId === auth?.userId) return;
      setTyping(`chat_${chatId}`, userId, isTyping);
      if (isTyping) {
        setTimeout(() => setTyping(`chat_${chatId}`, userId, false), 3000);
      }
    });
  };

  const unsubscribeFromChat = (chatId) => {
    wsService.unsubscribe(`/topic/chat/${chatId}`);
    wsService.unsubscribe(`/topic/chat/${chatId}/typing`);
  };

  const sendTyping = (chatId, isTypingNow) => {
    wsService.publish(`/app/chat/${chatId}/typing`, { typing: isTypingNow });
  };
  const [callHistory, setCallHistory] = useState([]);
  const activeCall = useCallStore((s) => s.activeCall);
  const prevActiveCallRef = useRef(null);
  const [chatDetail, setChatDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const chatMessages = messages[activeChatId] || [];
  const typingKey = `chat_${activeChatId}`;
  const typingSet = typingUsers[typingKey] || new Set();
  const isTyping = typingSet.size > 0;

  function scrollToBottom(smooth = true) {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }

  useEffect(() => {
    if (!activeChatId) return;

    // Reset state khi chuyển chat
    setLatestIncomingMsg(null);
    setSummaryDismissed(false);
    setInputValue('');
    setCallHistory([]);

    // Đọc lastVisit từ localStorage để tính unread cho Summary
    const storageKey = `chatLastVisit_${activeChatId}`;
    const lastVisit = localStorage.getItem(storageKey);
    // Fallback 7 ngày trước nếu là lần đầu mở chat — đảm bảo banner hiện khi có tin chưa đọc
    setLastVisitAt(lastVisit || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Lưu lại thời điểm mở chat hiện tại
    localStorage.setItem(storageKey, new Date().toISOString());

    setPage(0);
    setHasMore(true);
    setLoading(true);
    setLoadError(false);

    getChatDetail(activeChatId)
      .then((res) => {
        setChatDetail(res.data);
        updateChat(activeChatId, {
          chatName: res.data.chatName,
          avatarUrl: res.data.avatarUrl,
          recipientOnline: res.data.recipientOnline,
        });
      })
      .catch(() => {});

    getMessages(activeChatId, 0, 30)
      .then((res) => {
        const data = res.data;
        const fetchedMsgs = Array.isArray(data) ? data : (data.content || []);
        const sorted = fetchedMsgs.reverse ? fetchedMsgs.slice().reverse() : fetchedMsgs;
        // Merge: keep only WS messages newer than the latest API message (avoids re-appending old paginated messages)
        const alreadyInStore = useChatStore.getState().messages[activeChatId] || [];
        const fetchedIds = new Set(sorted.map((m) => m.id));
        const latestFetchedTime = sorted.length > 0
          ? new Date(sorted[sorted.length - 1].createdDate).getTime()
          : 0;
        const wsOnlyMsgs = alreadyInStore.filter(
          (m) => !fetchedIds.has(m.id) && new Date(m.createdDate).getTime() > latestFetchedTime
        );
        setMessages(activeChatId, [...sorted, ...wsOnlyMsgs]);
        setHasMore(fetchedMsgs.length === 30);
        setTimeout(() => scrollToBottom(false), 100);

        // Tính unread cho Summary Banner: tin nhắn mới hơn lastVisit, không phải của mình, không phải bot
        if (lastVisit) {
          const prevVisitTime = new Date(lastVisit).getTime();
          const unread = sorted.filter(
            (m) =>
              new Date(m.createdAt || m.createdDate).getTime() > prevVisitTime &&
              m.senderId !== auth?.userId &&
              m.senderId?.toString() !== AI_BOT_USER_ID
          ).length;
          setUnreadOnOpen(unread);
        } else {
          setUnreadOnOpen(0);
        }
      })
      .catch(() => { setLoadError(true); })
      .finally(() => setLoading(false));

    markSeen(activeChatId).catch(() => {});
    clearUnread(activeChatId);
    subscribeToChat(activeChatId);

    // Fetch call history cho chat này
    getCallHistory(activeChatId)
      .then((res) => setCallHistory(res.data || []))
      .catch(() => {});

    return () => {
      unsubscribeFromChat(activeChatId);
    };
  }, [activeChatId]);

  // Re-fetch messages after WebSocket reconnect to catch any missed during disconnect
  useEffect(() => {
    if (!activeChatId) return;
    const refetch = () => {
      getMessages(activeChatId, 0, 30)
        .then((res) => {
          const data = res.data;
          const fetchedMsgs = Array.isArray(data) ? data : (data.content || []);
          const sorted = fetchedMsgs.slice().reverse();
          const existing = useChatStore.getState().messages[activeChatId] || [];
          const fetchedIds = new Set(sorted.map((m) => m.id));
          const latestTime = sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdDate).getTime() : 0;
          const wsOnly = existing.filter((m) => !fetchedIds.has(m.id) && new Date(m.createdDate).getTime() > latestTime);
          setMessages(activeChatId, [...sorted, ...wsOnly]);
        })
        .catch(() => {});
    };
    wsService.onReconnect(refetch);
    return () => wsService.offReconnect(refetch);
  }, [activeChatId]);

  useEffect(() => {
    // Auto scroll to bottom only when new message arrives at the bottom
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [chatMessages.length]);

  // Refetch call history khi cuộc gọi kết thúc (activeCall → null)
  useEffect(() => {
    const wasActive = prevActiveCallRef.current !== null;
    const isNowNull = activeCall === null;
    if (wasActive && isNowNull && activeChatId) {
      // Đợi 1s để backend kịp lưu call session
      setTimeout(() => {
        getCallHistory(activeChatId)
          .then((res) => setCallHistory(res.data || []))
          .catch(() => {});
      }, 1000);
    }
    prevActiveCallRef.current = activeCall;
  }, [activeCall, activeChatId]);

  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container || loadingMore || !hasMore) return;

    if (container.scrollTop < 100) {
      setLoadingMore(true);
      prevScrollHeightRef.current = container.scrollHeight;
      const nextPage = page + 1;

      try {
        const res = await getMessages(activeChatId, nextPage, 30);
        const data = res.data;
        const msgs = Array.isArray(data) ? data : (data.content || []);
        if (msgs.length === 0) {
          setHasMore(false);
        } else {
          prependMessages(activeChatId, msgs.slice().reverse());
          setPage(nextPage);
          setTimeout(() => {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
          }, 50);
        }
      } catch {} // eslint-disable-line no-empty
      setLoadingMore(false);
    }
  }, [activeChatId, page, loadingMore, hasMore]);

  const handleSendText = async (content) => {
    try {
      const res = await sendMessage({ chatId: activeChatId, content, type: 'TEXT' });
      const msg = res.data;
      addMessage(activeChatId, msg);
      updateChatLastMessage(activeChatId, msg);
      setTimeout(() => scrollToBottom(), 50);
    } catch {
      toast.error('Không thể gửi tin nhắn');
    }
  };

  const handleSendMedia = async (files) => {
    const fileList = Array.isArray(files) ? files : [files];
    for (const file of fileList) {
      try {
        const res = await uploadMedia(activeChatId, file);
        addMessage(activeChatId, res.data);
        updateChatLastMessage(activeChatId, res.data);
      } catch {
        toast.error('Không thể gửi tệp');
      }
    }
    setTimeout(() => scrollToBottom(), 50);
  };

  const handleTyping = (isTypingNow) => {
    sendTyping(activeChatId, isTypingNow);
  };

  // Merge messages + call history thành một timeline sắp xếp theo thời gian
  const buildTimeline = (msgs, calls) => {
    const msgItems = msgs.map((m) => ({ ...m, _isCall: false, _time: new Date(m.createdDate || m.createdAt || 0).getTime() }));
    const callItems = calls.map((c) => ({ ...c, _isCall: true, _time: new Date(c.startedAt || 0).getTime() }));
    return [...msgItems, ...callItems].sort((a, b) => a._time - b._time);
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg font-medium">Chọn một cuộc trò chuyện</p>
          <p className="text-sm mt-1">để bắt đầu nhắn tin</p>
        </div>
      </div>
    );
  }

  const recipientName = chatDetail?.chatName || 'Người dùng';

  return (
    <div className="flex-1 flex h-full overflow-hidden">
    <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <button
          className="md:hidden p-1 hover:bg-gray-100 rounded-full"
          onClick={() => setActiveChatId(null)}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          onClick={() => chatDetail?.recipientId && setViewingProfileId(chatDetail.recipientId)}
          className="cursor-pointer flex-shrink-0"
        >
          <Avatar
            src={chatDetail?.avatarUrl}
            name={recipientName}
            size={40}
            online={chatDetail?.recipientOnline}
          />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => chatDetail?.recipientId && setViewingProfileId(chatDetail.recipientId)}
        >
          <h3 className="font-semibold text-gray-800 truncate hover:text-blue-600 transition-colors">{recipientName}</h3>
          <p className="text-xs text-gray-400">
            {chatDetail?.recipientOnline
              ? 'Đang hoạt động'
              : chatDetail?.recipientLastSeenText || 'Không hoạt động'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartCall?.({
              chatId:    activeChatId,
              peerId:    chatDetail?.recipientId,
              peerName:  recipientName,
              peerAvatar: chatDetail?.avatarUrl || null,
              callType:  'VOICE',
            })}
            disabled={!chatDetail?.recipientId}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Gọi thoại"
          >
            <Phone size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => onStartCall?.({
              chatId:    activeChatId,
              peerId:    chatDetail?.recipientId,
              peerName:  recipientName,
              peerAvatar: chatDetail?.avatarUrl || null,
              callType:  'VIDEO',
            })}
            disabled={!chatDetail?.recipientId}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Gọi video"
          >
            <Video size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowInfo((v) => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showInfo ? 'bg-blue-50 text-blue-500' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Thông tin"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Summary Banner — hiển thị khi có nhiều tin nhắn chưa đọc */}
      {!summaryDismissed && (
        <ChatSummaryBanner
          chatId={activeChatId}
          unreadCount={unreadOnOpen}
          since={lastVisitAt}
          onDismiss={() => setSummaryDismissed(true)}
        />
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm mb-3">Không thể tải tin nhắn</p>
            <button
              onClick={() => {
                setLoadError(false);
                setLoading(true);
                getMessages(activeChatId, 0, 30)
                  .then((res) => {
                    const data = res.data;
                    const fetchedMsgs = Array.isArray(data) ? data : (data.content || []);
                    const sorted = fetchedMsgs.slice().reverse();
                    setMessages(activeChatId, sorted);
                    setTimeout(() => scrollToBottom(false), 100);
                  })
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Thử lại
            </button>
          </div>
        ) : (
          buildTimeline(chatMessages, callHistory).map((item) => (
            item._isCall ? (
              <CallBubble key={`call-${item.id}`} call={item} />
            ) : (
              <MessageBubble key={item.id} message={item} chatId={activeChatId} />
            )
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {chatDetail?.blockStatus && chatDetail.blockStatus !== 'NONE' ? (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-400 select-none">
          {chatDetail.blockStatus === 'BLOCKED_BY_ME'
            ? 'Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục nhắn tin.'
            : 'Bạn không thể nhắn tin với người dùng này.'}
        </div>
      ) : (
        <div className="border-t border-gray-100 bg-white">
          {/* Smart Reply Suggestions */}
          <ChatSmartReplySuggestions
            chatId={activeChatId}
            latestMessage={latestIncomingMsg}
            onSelect={(text) => handleSendText(text)}
            inputValue={inputValue}
          />
          <MessageInput
            onSendText={handleSendText}
            onSendMedia={handleSendMedia}
            onTyping={handleTyping}
            onInputChange={(val) => setInputValue(val)}
            placeholder="Nhập tin nhắn... (dùng @AI để hỏi trợ lý)"
          />
        </div>
      )}
    </div>

    {showInfo && (
      <ChatInfoPanel chatDetail={chatDetail} onClose={() => setShowInfo(false)} />
    )}
    </div>
  );
}
