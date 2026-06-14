import { useEffect, useRef } from 'react';
import wsService from '../services/websocket';
import { heartbeat } from '../api/user';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { getChatDetail } from '../api/chat';
import { markDelivered, markAllDelivered, markSeen } from '../api/message';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const { auth, setSessionReplaced, setBannedInfo } = useAuthStore();
  const {
    addMessage,
    updateMessage,
    updateMessageReactions,
    updateChatMessagesState,
    addGroupMessage,
    updateGroupMessage,
    updateGroupMessageReactions,
    setTyping,
    setUserOnline,
    updateChatLastMessage,
    updateGroupLastMessage,
    incrementGroupUnread,
    clearGroupUnread,
    incrementUnread,
    activeChatId,
    activeGroupId,
    activeTab,
    clearUnread,
    chats,
    groups,
    setChats,
    setGroups,
    setActiveGroupId,
    addPendingRequest,
    addContact,
    updateSentRequest,
    addGroupJoinRequest,
  } = useChatStore();

  const chatsRef = useRef(chats);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  const activeChatIdRef = useRef(activeChatId);
  const activeGroupIdRef = useRef(activeGroupId);
  const activeTabRef = useRef(activeTab);
  // Ref để subscription callbacks luôn dùng userId hiện tại, tránh stale closure
  const authUserIdRef = useRef(auth?.userId);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    activeGroupIdRef.current = activeGroupId;
  }, [activeGroupId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    authUserIdRef.current = auth?.userId;
  }, [auth?.userId]);

  // Subscribe to all inactive group topics so the sidebar group list updates in real-time
  useEffect(() => {
    groups.forEach((group) => {
      if (group.id === activeGroupId) return; // GroupWindow manages the active group's subscription
      wsService.subscribe(`/topic/group/${group.id}`, (data) => {
        // Ignore reaction events
        if (data.messageId !== undefined && data.reactions !== undefined && !data.id) return;
        updateGroupLastMessage(group.id, data);
        if (data.type !== 'SYSTEM') incrementGroupUnread(group.id);
      });
    });
  }, [groups.length, activeGroupId]);

  // Subscribe to all inactive chat topics so the sidebar list updates in real-time
  // (the reliable path — personal queue can have STOMP routing issues)
  useEffect(() => {
    chats.forEach((chat) => {
      if (chat.id === activeChatId) return; // ChatWindow manages the active chat's subscription
      wsService.subscribe(`/topic/chat/${chat.id}`, (event) => {
        // State change broadcast (seen/delivered) — cập nhật trạng thái, không phải tin nhắn mới
        if (event.newState !== undefined && event.messageSenderId !== undefined && !event.id) {
          updateChatMessagesState(chat.id, event.newState, event.messageSenderId);
          return;
        }
        addMessage(chat.id, event);
        updateChatLastMessage(chat.id, event);
        if (activeChatIdRef.current !== chat.id) {
          incrementUnread(chat.id);
          // Người nhận đang online nhưng chưa mở chat → DELIVERED
          if (event.senderId !== authUserIdRef.current) {
            markDelivered(chat.id).catch(() => {});
          }
        }
      });
    });
  }, [chats.length, activeChatId]); // re-run when chat list size changes or active chat changes

  useEffect(() => {
    if (!auth?.accessToken) return;

    const heartbeatInterval = setInterval(() => { heartbeat().catch(() => {}); }, 60_000);

    wsService.connect(auth.accessToken, () => {
      // Khi reconnect: đánh dấu tất cả messages chưa nhận → DELIVERED
      markAllDelivered().catch(() => {});

      // Personal queue: handles new chats (not yet in list) and stores messages.
      // UI updates (lastMessage, unreadCount) are handled by the topic subscriptions above.
      wsService.subscribe('/user/queue/messages', (message) => {
        const chatId = message.chatId;
        // New chat not yet in local list — fetch its detail and prepend to list
        if (!chatsRef.current.find((c) => c.id === chatId)) {
          getChatDetail(chatId)
            .then((res) => setChats((prev) => [res.data, ...prev.filter((c) => c.id !== chatId)]))
            .catch(() => {});
        }
        addMessage(chatId, message);
        // Do NOT call updateChatLastMessage / incrementUnread here —
        // the topic subscription handler above does that to avoid double-counting.
        // Nhưng CẦN markDelivered cho chat không active — đặc biệt new chat chưa có topic sub
        if (activeChatIdRef.current !== chatId && message.senderId !== authUserIdRef.current) {
          markDelivered(chatId).catch(() => {});
        }
      });

      // Subscribe to delivered notifications (sender nhận được khi receiver online)
      wsService.subscribe('/user/queue/delivered', (data) => {
        const { chatId } = data;
        updateChatMessagesState(chatId, 'DELIVERED', authUserIdRef.current);
      });

      // Subscribe to seen notifications
      wsService.subscribe('/user/queue/seen', (data) => {
        const { chatId } = data;
        updateChatMessagesState(chatId, 'SEEN', authUserIdRef.current);
        clearUnread(chatId);
      });

      // Subscribe to message recalled
      wsService.subscribe('/user/queue/message-recalled', (data) => {
        const { messageId, chatId } = data;
        updateMessage(chatId, messageId, { deleted: true, content: '' });
      });

      // Subscribe to reactions
      wsService.subscribe('/user/queue/reactions', (data) => {
        const { messageId, chatId, reactions } = data;
        updateMessageReactions(chatId, messageId, reactions);
      });

      // Subscribe to incoming friend requests
      wsService.subscribe('/user/queue/friend-request', (data) => {
        addPendingRequest(data);
        toast(`${data.senderName.trim()} đã gửi lời mời kết bạn`);
      });

      // Subscribe to force-logout (đăng nhập từ nơi khác hoặc bị ban)
      wsService.subscribe('/user/queue/force-logout', (data) => {
        wsService.disconnect();
        if (data?.reason === 'ACCOUNT_BANNED') {
          setBannedInfo({ reason: data.banReason || '', banUntil: data.banUntil || null });
        } else {
          setSessionReplaced();
        }
      });

      // Subscribe to group reaction notifications (someone reacted to your message)
      wsService.subscribe('/user/queue/group-reactions', (data) => {
        toast(`${data.reactorName} đã thả ${data.emoji} vào tin nhắn của bạn`,
          { icon: data.emoji, duration: 3000 });
      });

      // Subscribe to group management events (kicked from group, dissolved, etc.)
      wsService.subscribe('/user/queue/group-events', (data) => {
        if (data.type === 'MEMBER_REMOVED' && data.targetUserId === authUserIdRef.current) {
          setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
          if (activeGroupIdRef.current === data.groupId) {
            setActiveGroupId(null);
          }
          toast('Bạn đã bị xóa khỏi nhóm');
        } else if (data.type === 'GROUP_DISSOLVED') {
          setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
          if (activeGroupIdRef.current === data.groupId) {
            setActiveGroupId(null);
          }
          toast('Nhóm đã bị giải tán');
        } else if (data.type === 'JOIN_REQUEST' && data.joinRequest) {
          addGroupJoinRequest(data.groupId, data.joinRequest);
          const name = data.joinRequest.requestedByName || 'Thành viên';
          const target = data.joinRequest.targetUserName || 'người dùng';
          toast(`${name} muốn thêm ${target} vào nhóm`, { icon: '👥' });
        }
      });

      // Subscribe to friend request accepted
      wsService.subscribe('/user/queue/friend-request-accepted', (data) => {
        const friend = {
          id: data.receiverId,
          firstName: data.receiverName.split(' ')[0],
          lastName: data.receiverName.split(' ').slice(1).join(' '),
          email: data.receiverEmail,
          avatarUrl: data.receiverAvatarUrl,
          friendshipStatus: 'ACCEPTED',
        };
        addContact(friend);
        updateSentRequest(data.id, { status: 'ACCEPTED' });
        toast.success(`${data.receiverName.trim()} đã chấp nhận lời mời kết bạn`);
      });
    });

    return () => {
      clearInterval(heartbeatInterval);
      // Don't disconnect on unmount of hook — managed by logout
    };
  }, [auth?.accessToken]);

  const subscribeToChat = (chatId) => {
    // Subscribe to message delivery topic (broadcast, same pattern as group messages)
    wsService.subscribe(`/topic/chat/${chatId}`, (event) => {
      // State change broadcast (seen/delivered) — cập nhật trạng thái, không phải tin nhắn mới
      if (event.newState !== undefined && event.messageSenderId !== undefined && !event.id) {
        updateChatMessagesState(chatId, event.newState, event.messageSenderId);
        return;
      }
      addMessage(chatId, event);
      updateChatLastMessage(chatId, event);
      if (activeChatIdRef.current !== chatId) {
        incrementUnread(chatId);
        // Chat không mở nhưng online → DELIVERED
        if (event.senderId !== authUserIdRef.current) {
          markDelivered(chatId).catch(() => {});
        }
      } else if (event.senderId !== authUserIdRef.current) {
        // Chat đang mở → SEEN ngay lập tức
        markSeen(chatId).catch(() => {});
      }
    });
    wsService.subscribe(`/topic/chat/${chatId}/typing`, (data) => {
      const { userId, isTyping } = data;
      if (userId === auth?.userId) return;
      setTyping(`chat_${chatId}`, userId, isTyping);
      if (isTyping) {
        setTimeout(() => {
          setTyping(`chat_${chatId}`, userId, false);
        }, 3000);
      }
    });
  };

  const unsubscribeFromChat = (chatId) => {
    wsService.unsubscribe(`/topic/chat/${chatId}`);
    wsService.unsubscribe(`/topic/chat/${chatId}/typing`);
  };

  const subscribeToGroup = (groupId) => {
    wsService.subscribe(`/topic/group/${groupId}`, (data) => {
      // ReactionGroupEvent has { messageId, reactions }, new messages have { id, content, ... }
      if (data.messageId !== undefined && data.reactions !== undefined && !data.id) {
        updateGroupMessageReactions(groupId, data.messageId, data.reactions);
      } else {
        addGroupMessage(groupId, data);
        updateGroupLastMessage(groupId, data);
      }
    });

    wsService.subscribe(`/topic/group/${groupId}/typing`, (data) => {
      const { userId, isTyping } = data;
      if (userId === auth?.userId) return;
      setTyping(`group_${groupId}`, userId, isTyping);
      if (isTyping) {
        setTimeout(() => {
          setTyping(`group_${groupId}`, userId, false);
        }, 3000);
      }
    });
  };

  const unsubscribeFromGroup = (groupId) => {
    wsService.unsubscribe(`/topic/group/${groupId}`);
    wsService.unsubscribe(`/topic/group/${groupId}/typing`);
  };

  const subscribeToUserStatus = (userId) => {
    wsService.subscribe(`/topic/user/${userId}/status`, (data) => {
      setUserOnline(data.userId, data.isOnline);
    });
  };

  const sendTyping = (chatId, typing) => {
    wsService.publish(`/app/chat/${chatId}/typing`, { typing });
  };

  const sendGroupTyping = (groupId, typing) => {
    wsService.publish(`/app/group/${groupId}/typing`, { typing });
  };

  return {
    subscribeToChat,
    unsubscribeFromChat,
    subscribeToGroup,
    unsubscribeFromGroup,
    subscribeToUserStatus,
    sendTyping,
    sendGroupTyping,
  };
}
