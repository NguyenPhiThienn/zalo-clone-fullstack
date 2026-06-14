import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useFriend";
import { getAvatarUrl, formatFullName } from "@/lib/utils";
import { StatusBar } from "expo-status-bar";

export default function BlockedListScreen() {
  const { data: blockedUsers, isLoading, refetch, isRefetching } = useBlockedUsers();
  const { mutate: unblock, isPending: isUnblocking } = useUnblockUser();

  const handleUnblock = (userId: string, name: string) => {
    Alert.alert(
      "Bỏ chặn người dùng",
      `Bạn có chắc chắn muốn bỏ chặn ${name}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: () => {
            unblock(userId, {
              onSuccess: () => {
                Alert.alert("Thành công", `Đã bỏ chặn ${name}`);
                refetch();
              },
              onError: () => {
                Alert.alert("Lỗi", "Không thể bỏ chặn người dùng lúc này");
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0068FF" />
      <SafeAreaView edges={["top"]} style={styles.headerSafeArea} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách chặn</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : !blockedUsers || blockedUsers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Danh sách chặn trống</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const name = formatFullName(item.firstName, item.lastName);
            return (
              <View style={styles.userRow}>
                <Image
                  source={{ uri: getAvatarUrl(name, item.avatarUrl) }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => handleUnblock(item.id, name)}
                  disabled={isUnblocking}
                >
                  <Text style={styles.unblockBtnText}>Bỏ chặn</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  headerSafeArea: { backgroundColor: "#0068FF" },
  header: {
    backgroundColor: "#0068FF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 16, padding: 4 },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontFamily: "Jakarta-Medium",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: {
    fontFamily: "Jakarta-Medium",
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 16,
  },
  listContent: { paddingVertical: 8 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB" },
  userInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  userName: { fontFamily: "Jakarta-Bold", fontSize: 15, color: "#1F2937" },
  userEmail: { fontFamily: "Jakarta", fontSize: 13, color: "#6B7280", marginTop: 2 },
  unblockBtn: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  unblockBtnText: {
    fontFamily: "Jakarta-Bold",
    fontSize: 13,
    color: "#0068FF",
  },
});
