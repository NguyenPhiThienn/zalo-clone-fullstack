// components/HomeScreen/ConversationList/index.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useChats } from "@/hooks/useChat";
import { useMyGroups } from "@/hooks/useGroup";
import { ChatDto } from "@/api/chat";
import { GroupDto } from "@/api/group";
import { getAvatarUrl, parseBackendDate } from "@/lib/utils";

const ConversationList = () => {
  const { data: chats, isLoading: loadingChats, refetch: refetchChats, isRefetching: refetchingChats } = useChats();
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups, isRefetching: refetchingGroups } = useMyGroups();
  const queryClient = useQueryClient();

  const isLoading = loadingChats || loadingGroups;
  const isRefetching = refetchingChats || refetchingGroups;

  // Luôn dùng cache trực tiếp làm source of truth — sort trong useMemo để FlatList nhận data mới nhất
  const [allConversations, setAllConversations] = useState<any[]>([]);

  useEffect(() => {
    const list = [
      ...(chats || []),
      ...(groups || []).map((g: any) => ({
        ...g,
        isGroup: true,
        chatName: g.name,
        lastMessageTime: g.lastMessageTime,
      }))
    ];

    const sorted = [...list].sort((a, b) => {
      const sA = (a as any)._sortOrder || 0;
      const sB = (b as any)._sortOrder || 0;

      // Nếu cả 2 có _sortOrder (đều đã nhận tin nhắn qua Socket) → ưu tiên _sortOrder cao hơn lên trước
      if (sA !== 0 || sB !== 0) {
        if (sB !== sA) return sB - sA;
      }

      // Fallback: sort theo lastMessageTime (cho lần load đầu chưa có _sortOrder)
      const dateA = parseBackendDate((a as any).lastMessageTime);
      const dateB = parseBackendDate((b as any).lastMessageTime);
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return timeB - timeA;
    });

    setAllConversations(sorted);
  }, [chats, groups]);

  const handleRefresh = () => {
    refetchChats();
    refetchGroups();
  };

  const getPreview = (item: any): string => {
    if (!item.lastMessage) return "Bắt đầu trò chuyện";
    const { lastMessage, lastMessageType } = item;
    if (lastMessageType === "IMAGE") return "🖼 Hình ảnh";
    if (lastMessageType === "VIDEO") return "🎥 Video";
    if (lastMessageType === "FILE") return "📎 File";
    if (lastMessageType === "AUDIO" || lastMessageType === "VOICE") return "🎵 Âm thanh";
    return lastMessage;
  };

  const formatTime = (iso?: any): string => {
    if (!iso) return "";
    const d = parseBackendDate(iso);
    if (!d) return "";
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Hôm qua";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  if (!isLoading && (!chats || chats.length === 0) && (!groups || groups.length === 0)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Chưa có tin nhắn nào</Text>
        <Text style={styles.emptySubtitle}>Mở tab Danh bạ để bắt đầu trò chuyện</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={allConversations}
      keyExtractor={(item) => ((item as any).isGroup ? `group-${item.id}` : item.id)}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
      contentContainerStyle={{ paddingBottom: 12 }}
      ListHeaderComponent={
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/(root)/ai-chat")}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: "https://api.dicebear.com/9.x/bottts/png?seed=ZaloAI&backgroundColor=b6e3f4" }}
              style={[styles.avatar, { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }]}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={[styles.name, { color: '#7C3AED', fontFamily: 'Jakarta-Bold' }]} numberOfLines={1}>
                Trợ lý Zalo Clone AI ✨
              </Text>
              <Text style={styles.time}>Vừa xong</Text>
            </View>
            <View style={styles.bottomRow}>
              <Text style={[styles.preview, { color: '#9333EA' }]} numberOfLines={1}>
                Chào bạn! Tôi có thể giúp gì cho bạn?
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      }
      renderItem={({ item }) => {
        const isGroup = !!(item as any).isGroup;
        const name = (item as any).chatName || (item as any).recipientEmail || "Người dùng";
        const avatarUrl = getAvatarUrl(name, (item as any).avatarUrl);
        const preview = getPreview(item);
        const time = formatTime((item as any).lastMessageTime);
        const unreadCount = (item as any).unreadCount || 0;
        const hasUnread = unreadCount > 0;

        const senderLabel = (item as any).lastMessageSenderName || "";
        const showSenderPrefix = !!senderLabel && item.lastMessage && item.lastMessage !== "Bắt đầu trò chuyện";

        return (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/(root)/chat/[id]",
                params: {
                  id: item.id,
                  name: (item as any).chatName || "",
                  isGroup: isGroup ? "true" : "false"
                },
              })
            }
            activeOpacity={0.7}
          >
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              {!isGroup && (item as any).recipientOnline && <View style={styles.onlineDot} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text
                  style={[styles.name, hasUnread ? styles.nameBold : styles.nameMedium]}
                  numberOfLines={1}
                >
                  {isGroup ? `👥 ${name}` : name}
                </Text>
                <Text style={[styles.time, hasUnread && styles.timeBlue]}>{time}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                  {showSenderPrefix ? `${senderLabel}: ${preview}` : preview}
                </Text>
                {hasUnread && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              {!isGroup && !(item as any).recipientOnline && (item as any).recipientLastSeenText ? (
                <Text style={styles.lastSeen}>{(item as any).recipientLastSeenText}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Jakarta-Bold", color: "#9CA3AF", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, fontFamily: "Jakarta-Medium", color: "#D1D5DB", textAlign: "center", paddingHorizontal: 32 },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F3F4F6" },
  avatarWrapper: { position: "relative", marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#E5E7EB" },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E", borderWidth: 2, borderColor: "white" },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  name: { fontSize: 16, fontFamily: "Jakarta-Medium", color: "#1F2937", flex: 1, marginRight: 8 },
  nameMedium: { fontFamily: "Jakarta-Medium" },
  nameBold: { fontFamily: "Jakarta-Bold", color: "#000" },
  time: { fontSize: 12, fontFamily: "Jakarta-Medium", color: "#9CA3AF" },
  timeBlue: { color: "#0068FF" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  preview: { fontSize: 14, fontFamily: "Jakarta", color: "#6B7280", flex: 1 },
  previewUnread: { fontFamily: "Jakarta-Medium", color: "#111827" },
  badge: { backgroundColor: "#EF4444", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, marginLeft: 8 },
  badgeText: { color: "white", fontSize: 10, fontFamily: "Jakarta-Bold" },
  lastSeen: { fontSize: 11, color: "#94A3B8", fontFamily: "Jakarta-Medium", marginTop: 2 },
});

export default ConversationList;
