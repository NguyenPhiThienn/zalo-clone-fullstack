/* eslint-disable */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '@/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyGroups } from '@/api/group';
import { getAllChats, getChatById, startOrGetChat } from '@/api/chat';
import { markMessagesAsSeen } from '@/api/message';
import { setNotificationHandler, requestPermissionsAsync, scheduleNotificationAsync } from 'expo-notifications';
import { showMessage } from 'react-native-flash-message';
import { router } from 'expo-router';
// @ts-ignore
import SockJS from 'sockjs-client';
import { nextSortOrder } from '@/lib/sortCounter';

// @ts-ignore
setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as any),
});

if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('text-encoding');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

interface SocketContextType {
    isConnected: boolean;
    publish: (destination: string, body: any) => void;
    subscribeToChat: (chatId: string, callback: (data: any) => void) => () => void;
    setActiveChat: (chatId: string | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((state: any) => state.token);
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef<Client | null>(null);
    const queryClient = useQueryClient();
    const chatListeners = useRef<Record<string, ((data: any) => void)[]>>({});
    const activeChatIdRef = useRef<string | null>(null);

    // Helpers definition
    const updateCache = (chatId: string, messageId: string, content: string, createdAt: any, senderName: string, type: string, isGroup: boolean, senderId: string, mediaUrl: string | null = null, deleted: boolean = false, fileName: string | null = null, replyTo: any = null) => {
        if (!content && !mediaUrl && !deleted) return;

        const listKey = isGroup ? ['groups'] : ['chats'];
        const detailKey = isGroup ? ['group-messages', chatId, 0] : ['messages', chatId, 0];

        let time = createdAt;
        if (Array.isArray(createdAt)) {
            time = new Date(createdAt[0], createdAt[1] - 1, createdAt[2], createdAt[3], createdAt[4], createdAt[5]).toISOString();
        } else if (!createdAt) {
            time = new Date().toISOString();
        }

        const currentUser = useAuthStore.getState().user;
        const isMe = senderId && currentUser && senderId === (currentUser as any).id;
        const isNotMe = !isMe;
        const shouldIncrement = isNotMe && (activeChatIdRef.current !== chatId);

        // Hàm tạo chat entry với last message mới nhất — PURE function, không side effects
        const makeChatEntry = (item: any) => ({
            ...item,
            lastMessage: deleted ? "Tin nhắn đã bị thu hồi" : (content || "[Hình ảnh/Video]"),
            lastMessageType: type || 'TEXT',
            lastMessageTime: time,
            lastMessageSenderName: isMe ? "Bạn" : (senderName || ""),
            unreadCount: (item.unreadCount || 0) + (shouldIncrement ? 1 : 0),
            _sortOrder: nextSortOrder(),
        });

        // 1. Cập nhật HOME LIST
        // Đọc cache đồng bộ TRƯỚC để tránh side effects bên trong setQueryData updater
        const currentList: any[] | undefined = queryClient.getQueryData(listKey);
        const existingIndex = currentList ? currentList.findIndex((item: any) => item.id === chatId) : -1;

        if (existingIndex !== -1 && currentList) {
            // Chat đã có → cập nhật tại chỗ và đưa lên đầu (pure update)
            queryClient.setQueryData(listKey, (old: any[] | undefined) => {
                if (!old) return old;
                const list = [...old];
                const idx = list.findIndex((item: any) => item.id === chatId);
                if (idx === -1) return old;
                const updated = makeChatEntry(list[idx]);
                list.splice(idx, 1);
                list.unshift(updated);
                return list;
            });
        } else {
            // Chat CHƯA có trong list → fetch thông tin rồi chèn vào (async, ngoài updater)
            console.log('[DEBUG] updateCache: chat mới, listLength:', currentList ? currentList.length : 'undefined', '| chatId:', chatId);

            const fetchAndInsertChat = (retryCount: number = 0) => {
                getChatById(chatId).then((chatDto) => {
                    console.log('[DEBUG] getChatById success (attempt', retryCount + 1, '):', chatDto?.id);
                    const newChatEntry = makeChatEntry({
                        ...chatDto,
                        unreadCount: shouldIncrement ? 1 : 0,
                    });

                    queryClient.setQueryData(listKey, (old: any[] | undefined) => {
                        const list = old ? [...old] : [];
                        if (list.some((c: any) => c.id === chatId)) {
                            // Đã có (do startOrGetChat thêm vào trước) → chỉ update last message
                            return list.map((c: any) => c.id === chatId ? makeChatEntry(c) : c);
                        }
                        return [newChatEntry, ...list];
                    });

                    // Subscribe topic chat mới để nhận Delivered/Seen updates
                    if (clientRef.current?.connected && !subscribedChatsRef.current.has(chatId)) {
                        const sub = clientRef.current.subscribe(`/topic/chat/${chatId}`, (msg) => {
                            const data = JSON.parse(msg.body);
                            if (data.newState && !data.id) {
                                const senderIdStr = data.messageSenderId
                                    ? (typeof data.messageSenderId === 'string' ? data.messageSenderId : String(data.messageSenderId))
                                    : undefined;
                                updateMessageStatusInCache(chatId, data.newState, false, senderIdStr);
                            }
                        });
                        subscribedChatsRef.current.add(chatId);
                        subscriptionsRef.current[`chat-${chatId}`] = sub;
                        console.log(`[Socket] 📡 Subscribed to new chat topic: ${chatId}`);
                    }
                }).catch((err) => {
                    if (retryCount < 2) {
                        // Retry sau 1.5s — đợi BE transaction commit xong
                        console.warn('[DEBUG] getChatById failed (attempt', retryCount + 1, '), retry in 1500ms. chatId:', chatId, 'err:', err?.message);
                        setTimeout(() => fetchAndInsertChat(retryCount + 1), 1500);
                    } else {
                        // Sau 2 lần retry → invalidate để force refetch từ server
                        console.warn('[DEBUG] getChatById failed after 3 attempts, invalidating [chats]. chatId:', chatId);
                        queryClient.invalidateQueries({ queryKey: ['chats'] });
                    }
                });
            };

            fetchAndInsertChat(0);
        }

        // 2. Cập nhật CHI TIẾT (Chỉ khi tin nhắn detail đã được fetch/load sẵn trong cache)
        if (queryClient.getQueryData(detailKey) !== undefined) {
            queryClient.setQueryData(detailKey, (oldMessages: any[] | undefined) => {
                if (!oldMessages) return [];

                // Nếu là tin nhắn thu hồi/xóa
                if (deleted) {
                    const recallText = senderName ? `Tin nhắn đã được ${senderName} thu hồi` : "Tin nhắn đã được thu hồi";
                    return oldMessages.map((m: any) =>
                        (m.id === messageId || m.content === content || m.id === content)
                            ? { ...m, deleted: true, content: recallText, text: recallText }
                            : m
                    );
                }

                // Kiểm tra trùng lặp bằng ID chính xác từ server (Tránh trùng lặp do nhận Socket và REST cùng lúc)
                const isDup = oldMessages.some((m: any) => m.id === messageId);
                // Tìm tin nhắn lạc quan (optimistic) có cùng nội dung + sender để thay thế
                const optimisticMsgIndex = oldMessages.findIndex(m =>
                    (m.id?.startsWith('temp-') || m.state === 'SENDING') &&
                    m.senderId === senderId &&
                    m.content === content
                );

                if (isDup) {
                    // Nếu đã có, cập nhật lại với data chuẩn từ Socket
                    return oldMessages.map(m => m.id === messageId ? { ...m, mediaUrl, fileName, replyTo } : m);
                }

                if (optimisticMsgIndex !== -1) {
                    // Thay thế tin nhắn lạc quan bằng tin nhắn thật từ Socket
                    const newList = [...oldMessages];
                    newList[optimisticMsgIndex] = {
                        ...newList[optimisticMsgIndex],
                        id: messageId,
                        state: 'SENT',
                        createdAt: time,
                        createdDate: time,
                        mediaUrl: mediaUrl,
                        fileName: fileName,
                        replyTo: replyTo
                    };
                    return newList;
                }

                const newMessage = {
                    id: messageId,
                    chatId: chatId,
                    content: content,
                    text: content,
                    type: type || 'TEXT',
                    createdAt: time,
                    createdDate: time,
                    senderId: senderId,
                    senderName: senderName,
                    state: 'SENT',
                    deleted: deleted,
                    mediaUrl: mediaUrl,
                    fileName: fileName,
                    replyTo: replyTo,
                    reactions: []
                };
                return [newMessage, ...oldMessages];
            });
        }

        if (chatListeners.current[chatId]) {
            chatListeners.current[chatId].forEach(cb => cb({ chatId, messageId, content, createdAt: time, senderId, senderName, type, mediaUrl, deleted, fileName, replyTo }));
        }

        // 3. THÔNG BÁO (Nếu không phải chat đang mở)
        if (activeChatIdRef.current !== chatId && !deleted) {
            if (senderId !== (currentUser as any)?.id) {
                // Hiển thị Toast trong app
                showMessage({
                    message: senderName || "Tin nhắn mới",
                    description: content || "[Hình ảnh/Video]",
                    type: "info",
                    backgroundColor: "#0068FF",
                    onPress: () => {
                        router.push({
                            pathname: "/(root)/chat/[id]",
                            params: { id: chatId, name: senderName || "Chat", isGroup: String(isGroup) }
                        });
                    }
                });

                // Hiển thị Notification hệ thống
                scheduleNotificationAsync({
                    content: {
                        title: senderName || "Tin nhắn mới",
                        body: content || "[Hình ảnh/Video]",
                        data: { chatId, isGroup },
                    },
                    trigger: null,
                });
            }
        }

        // 4. ĐÁNH DẤU ĐÃ XEM NGAY LẬP TỨC (Nếu đang mở chat) — chỉ cho 1-1
        // Nhóm: BE tự clear unread trong getMessages(), không cần gọi API
        const myId = (currentUser as any)?.id;
        if (activeChatIdRef.current === chatId && senderId !== myId && !isGroup) {
          markMessagesAsSeen(chatId).catch(() => { });
        }
    };

    const updateReactionsInCache = (chatId: string, messageId: string, reactions: any[], isGroup: boolean) => {
        const detailKey = isGroup ? ['group-messages', chatId, 0] : ['messages', chatId, 0];
        console.log(`[Socket-Reactions] updateReactionsInCache called for chatId: ${chatId}, messageId: ${messageId}, reactions:`, JSON.stringify(reactions));
        queryClient.setQueryData(detailKey, (oldMessages: any[] | undefined) => {
            if (!oldMessages) {
                console.log(`[Socket-Reactions] Cache detailKey not found:`, detailKey);
                return oldMessages;
            }
            const updatedList = oldMessages.map((m: any) =>
                m.id === messageId ? { ...m, reactions } : m
            );
            const found = oldMessages.some((m: any) => m.id === messageId);
            console.log(`[Socket-Reactions] Message matched in cache: ${found}`);
            return updatedList;
        });
    };

    const STATE_ORDER: Record<string, number> = { SENDING: 0, SENT: 1, DELIVERED: 2, SEEN: 3 };

    const updateMessageStatusInCache = (chatId: string, status: string, isGroup: boolean, messageSenderId?: string) => {
        const detailKey = isGroup ? ['group-messages', chatId, 0] : ['messages', chatId, 0];
        queryClient.setQueryData(detailKey, (oldMessages: any[] | undefined) => {
            if (!oldMessages) return oldMessages;
            return oldMessages.map((m: any) => {
                // Chỉ cập nhật tin nhắn của người gửi được chỉ định (nếu có)
                if (messageSenderId && m.senderId !== messageSenderId) return m;
                // Chỉ nâng cấp trạng thái, không hạ xuống (SEEN > DELIVERED > SENT)
                const currentOrder = STATE_ORDER[m.state] ?? 0;
                const newOrder = STATE_ORDER[status] ?? 0;
                if (newOrder <= currentOrder) return m;
                return { ...m, state: status };
            });
        });
    };

    // Queries to keep chats and groups lists alive and synced dynamically
    const { data: chats } = useQuery<any[]>({
        queryKey: ["chats"],
        queryFn: getAllChats,
        enabled: isConnected && !!token,
        staleTime: Infinity,
    });

    const { data: groups } = useQuery<any[]>({
        queryKey: ["groups"],
        queryFn: getMyGroups,
        enabled: isConnected && !!token,
        staleTime: Infinity,
    });

    // Refs and effect for managing dynamic subscriptions to all chats & groups
    const subscribedChatsRef = useRef<Set<string>>(new Set());
    const subscribedGroupsRef = useRef<Set<string>>(new Set());
    const subscriptionsRef = useRef<Record<string, any>>({});

    useEffect(() => {
        if (!isConnected || !clientRef.current?.connected) {
            // Clear subscriptions on disconnect
            Object.values(subscriptionsRef.current).forEach((sub: any) => {
                try { sub.unsubscribe(); } catch (e) {}
            });
            subscribedChatsRef.current.clear();
            subscribedGroupsRef.current.clear();
            subscriptionsRef.current = {};
            return;
        }

        // 1. Subscribe to any new/existing chats in background
        chats?.forEach((chat) => {
            if (subscribedChatsRef.current.has(chat.id)) return;
            
            console.log(`[Socket] 📡 Background subscribing to chat topic: ${chat.id}`);
            const sub = clientRef.current!.subscribe(`/topic/chat/${chat.id}`, (msg) => {
                const data = JSON.parse(msg.body);
                // If it is a message state change update (Seen/Delivered)
                if (data.newState && !data.id) {
                    const senderIdStr = data.messageSenderId
                        ? (typeof data.messageSenderId === 'string' ? data.messageSenderId : String(data.messageSenderId))
                        : undefined;
                    updateMessageStatusInCache(chat.id, data.newState, false, senderIdStr);
                } 
                // If it is a new message
                else if (data.id) {
                    updateCache(chat.id, data.id, data.content, data.createdAt, data.senderName, data.type, false, data.senderId, data.mediaUrl, data.deleted, data.fileName, data.replyTo);
                }
            });
            subscribedChatsRef.current.add(chat.id);
            subscriptionsRef.current[`chat-${chat.id}`] = sub;
        });

        // 2. Subscribe to any new/existing groups in background
        groups?.forEach((group) => {
            if (subscribedGroupsRef.current.has(group.id)) return;

            console.log(`[Socket] 👥 Background subscribing to group topic: ${group.id}`);
            const sub = clientRef.current!.subscribe(`/topic/group/${group.id}`, (msg) => {
                const data = JSON.parse(msg.body);
                if (data.newState && !data.id) {
                    updateMessageStatusInCache(group.id, data.newState, true);
                } else if (data.id) {
                    updateCache(group.id, data.id, data.content, data.createdDate || data.createdAt, data.senderName, data.type, true, data.senderId, data.mediaUrl, data.deleted, data.fileName, data.replyTo);
                } else if (data.messageId && data.reactions) {
                    updateReactionsInCache(group.id, data.messageId, data.reactions, true);
                }
            });
            subscribedGroupsRef.current.add(group.id);
            subscriptionsRef.current[`group-${group.id}`] = sub;
        });

        // Cleanup unsubscribed items if they were removed from list
        const activeChatIds = new Set((chats || []).map((c: any) => c.id));
        subscribedChatsRef.current.forEach((id) => {
            if (!activeChatIds.has(id)) {
                console.log(`[Socket] 🗑 Unsubscribing from chat topic: ${id}`);
                try { subscriptionsRef.current[`chat-${id}`]?.unsubscribe(); } catch (e) {}
                subscribedChatsRef.current.delete(id);
                delete subscriptionsRef.current[`chat-${id}`];
            }
        });

        const activeGroupIds = new Set((groups || []).map((g: any) => g.id));
        subscribedGroupsRef.current.forEach((id) => {
            if (!activeGroupIds.has(id)) {
                console.log(`[Socket] 🗑 Unsubscribing from group topic: ${id}`);
                try { subscriptionsRef.current[`group-${id}`]?.unsubscribe(); } catch (e) {}
                subscribedGroupsRef.current.delete(id);
                delete subscriptionsRef.current[`group-${id}`];
            }
        });

    }, [chats, groups, isConnected]);

    useEffect(() => {
        const requestPermissions = async () => {
            const { status } = await requestPermissionsAsync();
            if (status !== 'granted') {
                console.log('Notification permissions not granted');
            }
        };
        requestPermissions();
    }, []);

    useEffect(() => {
        if (!token) return;

        const baseUrl = (process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_SERVER_URL?.split('/api/v1')[0] + '/ws') as string;
        const client = new Client({
            webSocketFactory: () => new SockJS(baseUrl),
            connectHeaders: { Authorization: `Bearer ${token}` },
            debug: (str) => console.log('[Socket-Debug]', str),
            reconnectDelay: 5000,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 0,
        });

        client.onConnect = () => {
            setIsConnected(true);

            // ─── LẮNG NGHE TIN NHẮN MỚI (Personal Queue) ─────────────────────
            // Kênh này nhận mọi tin nhắn 1-1 mới, bao gồm cả cuộc trò chuyện CHƯA TỪNG CÓ
            // BE gửi qua: /user/{email}/queue/messages → NotificationService.sendMessageNotification
            client.subscribe('/user/queue/messages', (msg) => {
                const data = JSON.parse(msg.body);
                console.log('[DEBUG] /user/queue/messages received:', JSON.stringify(data));
                if (data.id && data.chatId) {
                    updateCache(
                        data.chatId,
                        data.id,
                        data.content,
                        data.createdAt,
                        data.senderName,
                        data.type,
                        false, // isGroup
                        data.senderId,
                        data.mediaUrl,
                        data.deleted,
                        data.fileName,
                        data.replyTo
                    );
                }
            });

            // ─── LẮNG NGHE CÁC SỰ KIỆN HỆ THỐNG (Mức User) ───────────────────

            // 1. Lắng nghe thu hồi tin nhắn chat đơn
            client.subscribe('/user/queue/message-recalled', (msg) => {
                const data = JSON.parse(msg.body);
                if (data.messageId && data.chatId) {
                    const recallText = data.senderName ? `Tin nhắn đã được ${data.senderName} thu hồi` : "Tin nhắn đã được thu hồi";
                    queryClient.setQueryData(['messages', data.chatId, 0], (old: any[] | undefined) => {
                        if (!old) return old;
                        return old.map((m: any) => m.id === data.messageId
                            ? { ...m, deleted: true, content: recallText, text: recallText }
                            : m
                        );
                    });
                }
            });

            // 2. Lắng nghe thông báo Tag (@)
            client.subscribe('/user/queue/mentions', (msg) => {
                const data = JSON.parse(msg.body);
                const { groupId, groupName, senderName, text } = data;

                // Invalidate để có chấm đỏ và tin nhắn mới ở home
                queryClient.invalidateQueries({ queryKey: ["groups"] });
                queryClient.invalidateQueries({ queryKey: ["chats"] });
                if (groupId) queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });

                showMessage({
                    message: `Bạn được nhắc tên trong ${groupName}`,
                    description: text,
                    type: "warning",
                    backgroundColor: "#FF9500",
                    onPress: () => {
                        router.push({
                            pathname: "/(root)/chat/[id]",
                            params: { id: groupId, name: groupName, isGroup: "true" }
                        });
                    }
                });
                scheduleNotificationAsync({
                    content: { title: `Nhắc tên: ${groupName}`, body: text, data: { chatId: groupId, isGroup: true } },
                    trigger: null,
                });
            });

            // 3. Lắng nghe REACTION tin nhắn 1-1
            client.subscribe('/user/queue/reactions', (msg) => {
                try {
                    const data = JSON.parse(msg.body);
                    console.log('[Socket] Received 1-1 reaction event:', JSON.stringify(data));
                    if (data.messageId && data.chatId) {
                        updateReactionsInCache(data.chatId, data.messageId, data.reactions, false);
                    } else {
                        console.warn('[Socket] Reaction event payload missing messageId or chatId:', data);
                    }
                } catch (e) {
                    console.error('[Socket] Failed to parse reaction event body:', e);
                }
            });

            // 4. Lắng nghe trạng thái ĐÃ NHẬN (Delivered) — Người gửi nhận thông báo này
            client.subscribe('/user/queue/delivered', (msg) => {
                const data = JSON.parse(msg.body);
                // chatId dạng string UUID
                const chatId = data.chatId
                    ? (typeof data.chatId === 'string' ? data.chatId : String(data.chatId))
                    : null;
                if (chatId) {
                    const currentUser = useAuthStore.getState().user;
                    const myId = (currentUser as any)?.id;
                    // Chỉ cập nhật tin nhắn của mình (người nhận thông báo này là người gửi)
                    updateMessageStatusInCache(chatId, 'DELIVERED', false, myId);
                }
            });

            // 5. Lắng nghe trạng thái ĐÃ XEM (Seen) — Người gửi nhận thông báo này
            client.subscribe('/user/queue/seen', (msg) => {
                const data = JSON.parse(msg.body);
                const chatId = data.chatId
                    ? (typeof data.chatId === 'string' ? data.chatId : String(data.chatId))
                    : null;
                if (chatId) {
                    const currentUser = useAuthStore.getState().user;
                    const myId = (currentUser as any)?.id;
                    // Chỉ cập nhật tin nhắn của mình (người nhận thông báo này là người gửi)
                    updateMessageStatusInCache(chatId, 'SEEN', false, myId);
                }
            });

            // 6. Lắng nghe FORCE LOGOUT (đăng nhập từ nơi khác hoặc bị ban)
            client.subscribe('/user/queue/force-logout', (msg) => {
                const data = JSON.parse(msg.body);
                if (clientRef.current) {
                    clientRef.current.deactivate();
                }
                setIsConnected(false);
                useAuthStore.getState().logout();
                
                const reason = data?.reason === 'ACCOUNT_BANNED'
                    ? `Tài khoản của bạn đã bị khóa. Lý do: ${data.banReason || 'Không rõ'}`
                    : 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác.';
                
                require('react-native').Alert.alert(
                    "Phiên làm việc kết thúc",
                    reason,
                    [{ text: "Đăng nhập lại", onPress: () => router.replace('/(auth)/sign-in') }],
                    { cancelable: false }
                );
            });

            // 7. Lắng nghe nhận lời mời kết bạn mới
            client.subscribe('/user/queue/friend-request', (msg) => {
                const data = JSON.parse(msg.body);
                queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
                showMessage({
                    message: "Lời mời kết bạn mới",
                    description: `${data.senderName.trim()} đã gửi lời mời kết bạn cho bạn.`,
                    type: "info",
                    backgroundColor: "#0068FF",
                    onPress: () => {
                        router.push("/(root)/friend-requests");
                    }
                });
            });

            // 8. Lắng nghe khi người khác đồng ý kết bạn
            client.subscribe('/user/queue/friend-request-accepted', (msg) => {
                const data = JSON.parse(msg.body);
                queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
                queryClient.invalidateQueries({ queryKey: ["contacts"] });

                // Socket này được gửi đến người GỬI lời mời khi người nhận accept.
                // FriendRequestDto: senderId = người gửi lời mời, receiverId = người vừa accept.
                // Người nhận socket này là SENDER, bạn mới là RECEIVER → cần chat với receiverId.
                if (data.receiverId) {
                    console.log('[Socket] friend-request-accepted → startOrGetChat:', data.receiverId);
                    startOrGetChat(data.receiverId).then((newChat) => {
                        console.log('[Socket] startOrGetChat success, chatId:', newChat?.id);
                        queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
                            const currentList = old ? [...old] : [];
                            if (currentList.some(c => c.id === newChat.id)) return old;
                            return [newChat, ...currentList];
                        });
                    }).catch((err) => {
                        console.warn('[Socket] Proactive startChat failed:', err);
                    });
                }


                showMessage({
                    message: "Kết bạn thành công",
                    description: `${data.receiverName.trim()} đã chấp nhận lời mời kết bạn của bạn.`,
                    type: "success",
                    backgroundColor: "#22C55E",
                });
            });

            // 9. Lắng nghe group reactions khi có người khác bày tỏ cảm xúc tin nhắn của mình
            client.subscribe('/user/queue/group-reactions', (msg) => {
                const data = JSON.parse(msg.body);
                showMessage({
                    message: "Cảm xúc nhóm",
                    description: `${data.reactorName} đã thả ${data.emoji} vào tin nhắn của bạn.`,
                    type: "info",
                    backgroundColor: "#0068FF",
                });
            });

            // 10. LẮNG NGHE CÁC SỰ KIỆN NHÓM (Chuẩn hóa /queue/group-events)
            client.subscribe('/user/queue/group-events', (msg) => {
                const data = JSON.parse(msg.body);
                const { type, groupId, groupDto } = data;
                const groupName = groupDto?.name || "Hội nhóm";

                console.log(`[Socket] 🔊 GROUP EVENT RECEIVED: ${type}`, data);

                if (type === 'MEMBER_ADDED') {
                    console.log(`[Socket] ✨ ADDING NEW GROUP STUB: ${groupName} (${groupId})`);
                    queryClient.invalidateQueries({ queryKey: ['groups'] });

                    queryClient.setQueryData(['groups'], (old: any[] | undefined) => {
                        const newList = old ? [...old] : [];
                        if (newList.some(g => String(g.id) === String(groupId))) return old;

                        const stub = {
                            id: groupId,
                            name: groupName,
                            avatarUrl: groupDto?.avatarUrl,
                            lastMessage: "Bạn đã được thêm vào nhóm",
                            lastMessageTime: new Date().toISOString(),
                            unreadCount: 1,
                            isGroup: true
                        };
                        return [stub, ...newList];
                    });

                    // Subscribe tin nhắn mới cho nhóm này ngay lập tức
                    client.subscribe(`/topic/group/${groupId}`, (gMsg) => {
                        const gData = JSON.parse(gMsg.body);
                        if (gData.id) {
                            updateCache(groupId, gData.id, gData.content, gData.createdDate || gData.createdAt, gData.senderName, gData.type, true, gData.senderId, gData.mediaUrl, gData.deleted, gData.fileName, gData.replyTo);
                        } else if (gData.messageId && gData.reactions) {
                            updateReactionsInCache(groupId, gData.messageId, gData.reactions, true);
                        }
                    });

                    showMessage({
                        message: "Thông báo nhóm",
                        description: `Bạn vừa được thêm vào nhóm: ${groupName}`,
                        type: "success",
                        icon: "success",
                        duration: 5000
                    });

                    scheduleNotificationAsync({
                        content: { title: "Nhóm mới", body: `Bạn vừa được thêm vào nhóm: ${groupName}`, data: { chatId: groupId, isGroup: true } },
                        trigger: null,
                    });
                }

                if (type === 'MEMBER_REMOVED') {
                    const currentUser = useAuthStore.getState().user;
                    if (currentUser && String(data.targetUserId) === String((currentUser as any).id)) {
                        console.log(`[Socket] ⚠️ YOU WERE REMOVED FROM GROUP: ${groupId}`);
                        queryClient.invalidateQueries({ queryKey: ['groups'] });
                        if (String(activeChatIdRef.current) === String(groupId)) {
                            require('react-native').Alert.alert("Thông báo", `Bạn đã bị xóa khỏi nhóm "${groupName}".`);
                            router.replace('/(root)/tabs/home');
                        } else {
                            showMessage({
                                message: "Thông báo nhóm",
                                description: `Bạn đã bị xóa khỏi nhóm "${groupName}"`,
                                type: "warning",
                                backgroundColor: "#EF4444",
                            });
                        }
                    } else {
                        queryClient.invalidateQueries({ queryKey: ['group', groupId] });
                    }
                }

                if (type === 'GROUP_DISSOLVED') {
                    console.log(`[Socket] ⚠️ GROUP DISSOLVED: ${groupId}`);
                    queryClient.invalidateQueries({ queryKey: ['groups'] });
                    if (String(activeChatIdRef.current) === String(groupId)) {
                        require('react-native').Alert.alert("Thông báo", `Nhóm "${groupName}" đã bị giải tán.`);
                        router.replace('/(root)/tabs/home');
                    }
                }

                if (type === 'JOIN_REQUEST' && data.joinRequest) {
                    queryClient.invalidateQueries({ queryKey: ['group-join-requests', groupId] });
                    const requesterName = data.joinRequest.requestedByName || "Thành viên";
                    const targetName = data.joinRequest.targetUserName || "người dùng";
                    showMessage({
                        message: "Yêu cầu tham gia nhóm",
                        description: `${requesterName} muốn thêm ${targetName} vào nhóm`,
                        type: "info",
                        backgroundColor: "#0068FF",
                    });
                }

                if (type === 'MEMBER_LEFT') {
                    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
                    showMessage({
                        message: "Thông báo nhóm",
                        description: `${data.actorName || "Một thành viên"} đã rời nhóm`,
                        type: "info",
                        backgroundColor: "#0068FF",
                    });
                }

                if (type === 'ADMIN_CHANGED') {
                    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
                    showMessage({
                        message: "Thông báo nhóm",
                        description: `${data.actorName || "Một thành viên"} đã nhường quyền quản trị viên`,
                        type: "info",
                        backgroundColor: "#0068FF",
                    });
                }

                if (type === 'GROUP_UPDATED' && data.group) {
                    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
                }

                if (type === 'MESSAGE_PINNED' || type === 'MESSAGE_UNPINNED') {
                    queryClient.invalidateQueries({ queryKey: ['pinned-messages', groupId] });
                }
            });
        };

        client.onDisconnect = () => setIsConnected(false);
        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [token, queryClient]);

    const setActiveChat = (chatId: string | null) => {
        activeChatIdRef.current = chatId;
    };

    const subscribeToChat = (chatId: string, callback: (data: any) => void) => {
        if (!chatListeners.current[chatId]) chatListeners.current[chatId] = [];
        chatListeners.current[chatId].push(callback);
        return () => {
            if (chatListeners.current[chatId]) {
                chatListeners.current[chatId] = chatListeners.current[chatId].filter(cb => cb !== callback);
            }
        };
    };

    const publish = (destination: string, body: any) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish({ destination, body: JSON.stringify(body) });
        }
    };

    return (
        <SocketContext.Provider value={{ isConnected, publish, subscribeToChat, setActiveChat }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within a SocketProvider');
    return context;
}
