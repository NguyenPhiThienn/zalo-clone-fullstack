import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useChatStore = create(persist((set) => ({
  chats: [],
  groups: [],
  contacts: [], // accepted friends (UserDto[])
  pendingRequests: [], // incoming friend requests (FriendRequestDto[])
  sentRequests: [], // outgoing pending requests (FriendRequestDto[])
  activeChatId: null,
  activeGroupId: null,
  activeTab: 'chats', // 'chats' | 'groups' | 'search' | 'ai' | 'contacts'
  viewingProfileId: null,
  messages: {}, // { chatId: [MessageDto] }
  groupMessages: {}, // { groupId: [GroupMessageDto] }
  pinnedMessages: {}, // { groupId: [GroupMessageDto] }
  groupJoinRequests: {}, // { groupId: [GroupJoinRequestDto] }
  typingUsers: {}, // { 'chat_chatId': Set<userId>, 'group_groupId': Set<userId> }
  onlineUsers: {}, // { userId: boolean }

  setChats: (chats) =>
    set((state) => ({ chats: typeof chats === 'function' ? chats(state.chats) : chats })),

  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) =>
    set((state) => {
      if (state.contacts.find((c) => c.id === contact.id)) return state;
      return { contacts: [...state.contacts, contact] };
    }),
  removeContact: (userId) =>
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== userId) })),

  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  addPendingRequest: (req) =>
    set((state) => {
      if (state.pendingRequests.find((r) => r.id === req.id)) return state;
      return { pendingRequests: [...state.pendingRequests, req] };
    }),
  removePendingRequest: (requestId) =>
    set((state) => ({ pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId) })),

  setSentRequests: (sentRequests) => set({ sentRequests }),
  addSentRequest: (req) =>
    set((state) => {
      if (state.sentRequests.find((r) => r.id === req.id)) return state;
      return { sentRequests: [...state.sentRequests, req] };
    }),
  updateSentRequest: (requestId, updates) =>
    set((state) => ({
      sentRequests: state.sentRequests.map((r) => (r.id === requestId ? { ...r, ...updates } : r)),
    })),

  removeChat: (chatId) =>
    set((state) => {
      // eslint-disable-next-line no-unused-vars
      const { [chatId]: _removed, ...remainingMessages } = state.messages;
      return {
        chats: state.chats.filter((c) => c.id !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        messages: remainingMessages,
      };
    }),

  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
    })),
  setGroups: (groups) =>
    set((state) => ({ groups: typeof groups === 'function' ? groups(state.groups) : groups })),
  setActiveTab: (tab) => set((state) => {
    // Lưu lastVisit khi rời tab groups (group đang mở)
    if (state.activeGroupId && tab !== state.activeTab) {
      localStorage.setItem(`groupLastVisit_${state.activeGroupId}`, new Date().toISOString());
    }
    return {
      activeTab: tab,
      // Clear active window khi đổi tab — user phải click lại để mở
      ...(tab !== state.activeTab ? { activeChatId: null, activeGroupId: null } : {}),
    };
  }),

  setViewingProfileId: (id) => set({ viewingProfileId: id }),

  setActiveChatId: (id) => set({ activeChatId: id, activeGroupId: null }),
  setActiveGroupId: (id) => set((state) => {
    // Lưu lastVisit khi rời group cũ (kể cả switch sang group khác hoặc đóng về null)
    if (state.activeGroupId && state.activeGroupId !== id) {
      localStorage.setItem(`groupLastVisit_${state.activeGroupId}`, new Date().toISOString());
    }
    return { activeGroupId: id, activeChatId: null };
  }),

  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),

  prependMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...messages, ...(state.messages[chatId] || [])],
      },
    })),

  addMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messages[chatId] || [];
      // avoid duplicates
      if (existing.find((m) => m.id === message.id)) return state;
      return {
        messages: { ...state.messages, [chatId]: [...existing, message] },
      };
    }),

  updateMessage: (chatId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  updateMessageReactions: (chatId, messageId, reactions) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      },
    })),

  // Cập nhật messages trong chat có state !== SEEN sang toState
  // senderIdFilter: chỉ update messages do user này gửi (tránh update sai messages của người kia)
  updateChatMessagesState: (chatId, toState, senderIdFilter) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.state !== 'SEEN' && (!senderIdFilter || m.senderId === senderIdFilter)
            ? { ...m, state: toState }
            : m
        ),
      },
    })),

  setGroupMessages: (groupId, messages) =>
    set((state) => ({
      groupMessages: { ...state.groupMessages, [groupId]: messages },
    })),

  prependGroupMessages: (groupId, messages) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: [...messages, ...(state.groupMessages[groupId] || [])],
      },
    })),

  addGroupMessage: (groupId, message) =>
    set((state) => {
      const existing = state.groupMessages[groupId] || [];
      if (message.id != null && existing.find((m) => m.id === message.id)) return state;
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...existing, message],
        },
      };
    }),

  updateGroupMessage: (groupId, messageId, updates) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),

  setPinnedMessages: (groupId, messages) =>
    set((state) => ({
      pinnedMessages: { ...state.pinnedMessages, [groupId]: messages },
    })),

  setGroupJoinRequests: (groupId, requests) =>
    set((state) => ({
      groupJoinRequests: { ...state.groupJoinRequests, [groupId]: requests },
    })),
  addGroupJoinRequest: (groupId, req) =>
    set((state) => {
      const existing = state.groupJoinRequests[groupId] || [];
      if (existing.find((r) => r.id === req.id)) return state;
      return { groupJoinRequests: { ...state.groupJoinRequests, [groupId]: [req, ...existing] } };
    }),
  removeGroupJoinRequest: (groupId, requestId) =>
    set((state) => ({
      groupJoinRequests: {
        ...state.groupJoinRequests,
        [groupId]: (state.groupJoinRequests[groupId] || []).filter((r) => r.id !== requestId),
      },
    })),

  updateGroupMessageReactions: (groupId, messageId, reactions) =>
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] || []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      },
    })),

  updateChatLastMessage: (chatId, message) =>
    set((state) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat) return state;
      const updated = {
        ...chat,
        lastMessage: message.content,
        lastMessageType: message.type,
        lastMessageTime: message.createdAt,
      };
      return { chats: [updated, ...state.chats.filter((c) => c.id !== chatId)] };
    }),

  updateGroupLastMessage: (groupId, message) =>
    set((state) => {
      const group = state.groups.find((g) => g.id === groupId);
      if (!group) return state;
      const updated = {
        ...group,
        lastMessage: message.content,
        lastMessageType: message.type,
        lastMessageTime: message.createdDate,
        lastMessageSenderName: message.senderName,
      };
      return { groups: [updated, ...state.groups.filter((g) => g.id !== groupId)] };
    }),

  setTyping: (key, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingUsers[key] || []);
      if (isTyping) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return { typingUsers: { ...state.typingUsers, [key]: current } };
    }),

  setUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [userId]: isOnline },
    })),

  incrementUnread: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      ),
    })),

  clearUnread: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  incrementGroupUnread: (groupId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, unreadCount: (g.unreadCount || 0) + 1 } : g
      ),
    })),

  clearGroupUnread: (groupId) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, unreadCount: 0 } : g
      ),
    })),

  // Reset toàn bộ state về initial — gọi khi logout để tránh user mới thừa hưởng state cũ
  reset: () => set({
    chats: [],
    groups: [],
    contacts: [],
    pendingRequests: [],
    sentRequests: [],
    activeChatId: null,
    activeGroupId: null,
    activeTab: 'chats',
    viewingProfileId: null,
    messages: {},
    groupMessages: {},
    pinnedMessages: {},
    groupJoinRequests: {},
    typingUsers: {},
    onlineUsers: {},
  }),
}), {
  name: 'chat-session',
  partialize: (state) => ({
    activeChatId: state.activeChatId,
    activeGroupId: state.activeGroupId,
    activeTab: state.activeTab,
  }),
}));

export default useChatStore;
