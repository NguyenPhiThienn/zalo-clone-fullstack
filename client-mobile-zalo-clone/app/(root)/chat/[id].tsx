// app/(root)/chat/[id].tsx — đồng bộ với MessageDto.java mới
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ChatHeader from '@/components/ChatScreen/ChatHeader';
import MessageItem from '@/components/ChatScreen/MessageItem';
import ChatInput from '@/components/ChatScreen/ChatInput';
import { useMessages, useMarkSeen } from '@/hooks/useMessages';
import { MessageType } from '@/api/message';
import { useChatById } from '@/hooks/useChat';
import { useGroupById, useGroupMessages } from '@/hooks/useGroup';
import { useAuth } from '@/context/AuthContext';
import { getAvatarUrl, getImageUrl, parseBackendDate } from '@/lib/utils';
import { useSocket } from '@/context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import PinnedMessagesBar from '@/components/ChatScreen/PinnedMessagesBar';
import MissedMessagesBanner from '@/components/ChatScreen/MissedMessagesBanner';
import { Modal, ScrollView, TouchableOpacity as RNTouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSummarizeChat } from '@/hooks/useAi';

const ChatScreen = () => {
  const { id, name, isGroup } = useLocalSearchParams<{ id: string; name?: string; isGroup?: string }>();
  const isGroupBool = isGroup === 'true';
  const { user } = useAuth();
  const flatListRef = useRef<FlatList<any>>(null);
  const { subscribeToChat, setActiveChat } = useSocket(); // SỬA: Đã thêm setActiveChat ở đây
  const queryClient = useQueryClient();
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ content: string; stats: any } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content?: string; senderName?: string; mediaUrl?: string; type?: MessageType } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const { data: chat } = useChatById(!isGroupBool ? id : null);
  const { data: group } = useGroupById(isGroupBool ? id : null);
  const { data: soloMessages, isLoading: loadingSolo } = useMessages(!isGroupBool ? id : null);
  const { data: groupMessages, isLoading: loadingGroup } = useGroupMessages(isGroupBool ? id : null, 0, 50);

  const messages = isGroupBool ? groupMessages : soloMessages;
  const isLoading = isGroupBool ? loadingGroup : loadingSolo;

  const { mutate: markSeen } = useMarkSeen();
  const { mutate: summarizeChat, isPending: summarizingChat } = useSummarizeChat();

  const handleSummarizeChat = () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    summarizeChat({ chatId: id as string, since }, {
      onSuccess: (data) => {
        setSummaryData({ content: data.summary, stats: data });
        setShowSummary(true);
      },
      onError: () => {
        Alert.alert("Lỗi", "Không thể tạo tóm tắt hội thoại lúc này");
      }
    });
  };

  useEffect(() => {
    if (id) {
      const chatIdStr = Array.isArray(id) ? id[0] : id;
      // 0. Lưu lại số tin chưa đọc ban đầu để hiện Banner tóm tắt
      const listKey = isGroupBool ? ['groups'] : ['chats'];
      const currentList: any[] = queryClient.getQueryData(listKey) || [];
      const currentItem = currentList.find(c => c.id === chatIdStr);
      if (currentItem?.unreadCount > 0) {
        setInitialUnreadCount(currentItem.unreadCount);
      }

      // 1. Đánh dấu đang xem phòng này
      setActiveChat(chatIdStr);

      // 2. Reset số đỏ ở Home ngay lập tức
      queryClient.setQueryData(listKey, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === chatIdStr ? { ...item, unreadCount: 0 } : item
        );
      });

      // 3. Thông báo server (1-1)
      if (!isGroupBool) markSeen(id);

      return () => {
        setActiveChat(null); // Thoát phòng
      };
    }
  }, [id, isGroupBool]);

  // Cập nhật Cache từ Socket đã được xử lý tập trung bên SocketContext.tsx

  const chatName = (name as string) || (isGroupBool ? group?.name : chat?.chatName) || "Chat";
  const avatarUrl = isGroupBool ? group?.avatarUrl : chat?.avatarUrl;
  const isOnline = isGroupBool ? false : chat?.recipientOnline;
  const myId = user?.id || "";

  const formattedMessages = (messages as any[] || []).map((msg: any, idx: number) => {
    const sender = isGroupBool ? (group as any)?.members?.find((m: any) => (m.userId || m.id) === msg.senderId) : null;
    const isMe = msg.senderId === myId;
    const messageText = msg.text || ((!msg.deleted && !msg.mediaUrl) ? msg.content : (msg.deleted ? (msg.senderId === user?.id ? "Tin nhắn đã được thu hồi" : "Tin nhắn đã bị xóa") : ""));

    const rawDate = msg.createdDate || msg.createdAt;
    const parsedDate = parseBackendDate(rawDate);
    const timeStr = parsedDate
      ? parsedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '00:00';
    const isoStr = parsedDate ? parsedDate.toISOString() : undefined;

    return {
      id: msg.id || `${idx}`,
      chatId: id,
      senderId: msg.senderId || "",
      text: messageText,
      image: (!msg.deleted && msg.mediaUrl) ? msg.mediaUrl : undefined,
      mediaUrl: msg.mediaUrl,
      time: timeStr,
      createdAt: isoStr,
      type: msg.type || msg.messageType || 'TEXT',
      state: msg.state || (msg.id ? 'DELIVERED' : 'SENT'),
      avatar: sender?.avatarUrl ? getImageUrl(sender.avatarUrl) : (isGroupBool ? getAvatarUrl(msg.senderName || "User", undefined) : getAvatarUrl(chat?.chatName || "Other", chat?.avatarUrl)),
      senderName: sender?.fullName || msg.senderName || (msg.senderId === user?.id ? user?.name : (isGroupBool ? "User" : (chat?.chatName || "Người dùng"))),
      reactions: msg.reactions || [],
      replyTo: msg.replyTo,
      fileName: msg.fileName,
      deleted: msg.deleted,
      pinned: msg.pinned,
    };
  });

  const finalMessages = formattedMessages;

  useEffect(() => {
    if (finalMessages && finalMessages.length > 0) {
      if (finalMessages[0].senderId === myId) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    }
  }, [finalMessages?.[0]?.id]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#E2E9F1]">
        <ChatHeader
          name={chatName}
          avatarUrl={avatarUrl}
          online={isOnline}
          isGroup={isGroupBool}
          groupId={isGroupBool ? id : chat?.recipientId}
          onPressSummarize={!isGroupBool ? handleSummarizeChat : undefined}
          loadingSummarize={!isGroupBool ? summarizingChat : undefined}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#E2E9F1]">
      <ChatHeader
        name={chatName}
        avatarUrl={avatarUrl}
        online={isOnline}
        lastSeenText={isGroupBool ? undefined : chat?.recipientLastSeenText}
        isGroup={isGroupBool}
        groupId={isGroupBool ? id : chat?.recipientId}
        onPressSummarize={!isGroupBool ? handleSummarizeChat : undefined}
        loadingSummarize={!isGroupBool ? summarizingChat : undefined}
      />

      {isGroupBool && (
        <PinnedMessagesBar
          groupId={id}
          isAdmin={!!(group?.isAdmin || group?.createdById === user?.id)}
          onScrollToMessage={(msgId) => {
            const idx = finalMessages.findIndex((m: any) => m.id === msgId);
            if (idx !== -1 && flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
              setHighlightedMessageId(msgId);
              setTimeout(() => setHighlightedMessageId(null), 2000);
            }
          }}
        />
      )}

      {isGroupBool && initialUnreadCount > 5 && (
        <MissedMessagesBanner
          groupId={id}
          count={initialUnreadCount}
          onClose={() => setInitialUnreadCount(0)}
          onSummaryReady={(content, stats) => {
            setSummaryData({ content, stats });
            setShowSummary(true);
            setInitialUnreadCount(0);
          }}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {finalMessages.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-400 font-JakartaMedium">Bắt đầu cuộc trò chuyện</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={finalMessages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                isMe={item.senderId === myId}
                isGroup={isGroupBool}
                onReply={(msg) => {
                  let content = msg.text;
                  if (!content && msg.image) content = "📷 Hình ảnh";
                  if (!content && msg.type === 'VIDEO') content = "🎥 Video";
                  if (!content && msg.type === 'FILE') content = "📎 Tập tin";
                  if (!content && msg.type === 'AUDIO') content = "🎵 Âm thanh";

                  setReplyTo({
                    id: msg.id,
                    content: content || "Tệp đính kèm",
                    senderName: msg.senderName,
                    mediaUrl: msg.image,
                    type: msg.type as MessageType
                  });
                }}
                isHighlighted={item.id === highlightedMessageId}
                onScrollToMessage={(msgId) => {
                  const idx = finalMessages.findIndex((m: any) => m.id === msgId);
                  if (idx !== -1 && flatListRef.current) {
                    flatListRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
                    setHighlightedMessageId(msgId);
                    setTimeout(() => setHighlightedMessageId(null), 1500);
                  }
                }}
              />
            )}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 0 }}
          />
        )}
        <ChatInput
          chatId={id as string}
          isGroup={isGroupBool}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </KeyboardAvoidingView>

      {/* Tóm tắt AI Modal */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={20} color="#0068FF" />
                <Text style={s.modalTitle}>Tóm tắt nội dung mới</Text>
              </View>
              <RNTouchableOpacity onPress={() => setShowSummary(false)}>
                <Ionicons name="close" size={24} color="black" />
              </RNTouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={s.summaryText}>{summaryData?.content}</Text>

              {summaryData?.stats && (
                <View style={s.statsContainer}>
                  <View style={s.statRow}>
                    <Ionicons name="chatbubbles-outline" size={16} color="#6B7280" />
                    <Text style={s.statText}>{summaryData.stats.messageCount} tin nhắn mới</Text>
                  </View>
                  {summaryData.stats.topSpeakers && (
                    <View style={s.statRow}>
                      <Ionicons name="people-outline" size={16} color="#6B7280" />
                      <Text style={s.statText}>
                        Nổi bật: {Array.isArray(summaryData.stats.topSpeakers)
                          ? summaryData.stats.topSpeakers.map((item: any) =>
                            typeof item === 'string' ? item : `${item.name || 'User'} (${item.count || 0} tin)`
                          ).join(', ')
                          : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <RNTouchableOpacity
              style={s.closeBtn}
              onPress={() => setShowSummary(false)}
            >
              <Text style={s.closeBtnText}>Đã hiểu</Text>
            </RNTouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
    color: '#1F2937',
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'Jakarta-Medium',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Jakarta-Medium',
  },
  closeBtn: {
    backgroundColor: '#0068FF',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  closeBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Jakarta-Bold',
  },
});

export default ChatScreen;
