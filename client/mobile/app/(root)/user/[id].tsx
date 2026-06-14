import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/fetch";
import { UserDto } from "@/api/user";
import {
  useSendFriendRequest,
  useSentRequests,
  usePendingRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useUnfriend,
  useContacts,
  useBlockedUsers,
  useBlockUser,
  useUnblockUser
} from "@/hooks/useFriend";
import { useStartChat } from "@/hooks/useChat";
import { getAvatarUrl, formatFullName, parseBackendDate } from "@/lib/utils";
import ReportModal from "@/components/ReportModal";

const fetchUser = async (id: string): Promise<UserDto> => {
  return fetchAPI(`/user/${id}`);
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;

  const [showReport, setShowReport] = useState(false);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });

  const { data: contacts } = useContacts();
  const { data: sentRequests } = useSentRequests();
  const { data: pendingRequests } = usePendingRequests();
  const { data: blockedUsers } = useBlockedUsers();

  const { mutate: sendReq, isPending: isSendingReq } = useSendFriendRequest();
  const { mutate: unfriend, isPending: isUnfriending } = useUnfriend();
  const { mutate: acceptReq } = useAcceptFriendRequest();
  const { mutate: rejectReq } = useRejectFriendRequest();
  const { mutate: blockUser } = useBlockUser();
  const { mutate: unblockUser } = useUnblockUser();
  const { mutate: startChat, isPending: isStartingChat } = useStartChat();

  const isFriend = contacts?.some(c => c.id === id);
  const isSent = sentRequests?.some(r => r.receiverId === id);
  const incomingReq = pendingRequests?.find(r => r.senderId === id);
  const isBlocked = blockedUsers?.some(u => u.id === id);

  const friendStatus = user?.friendshipStatus || (isFriend ? 'ACCEPTED' : isSent ? 'PENDING_SENT' : incomingReq ? 'PENDING_RECEIVED' : 'NONE');
  const blockStatus = user?.blockStatus || (isBlocked ? 'BLOCKED_BY_ME' : 'NONE');

  const handleStartChat = () => {
    startChat(id, {
      onSuccess: (chat) => {
        router.push({ pathname: "/(root)/chat/[id]", params: { id: chat.id, name: name } });
      }
    });
  };

  const handleFriendAction = () => {
    if (friendStatus === 'ACCEPTED') {
      Alert.alert("Hủy kết bạn", `Bạn có chắc chắn muốn hủy kết bạn với ${name}?`, [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", style: "destructive", onPress: () => unfriend(id, { onSuccess: () => refetch() }) }
      ]);
    } else if (friendStatus === 'NONE') {
      sendReq(id, {
        onSuccess: () => refetch()
      });
    }
  };

  const handleAccept = () => {
    if (incomingReq) {
      acceptReq(incomingReq.id, {
        onSuccess: () => refetch()
      });
    }
  };

  const handleReject = () => {
    if (incomingReq) {
      rejectReq(incomingReq.id, {
        onSuccess: () => refetch()
      });
    }
  };

  const handleBlockAction = () => {
    if (blockStatus === 'BLOCKED_BY_ME') {
      unblockUser(id, {
        onSuccess: () => {
          refetch();
          Alert.alert("Thành công", "Đã bỏ chặn người dùng");
        }
      });
    } else {
      Alert.alert("Chặn người dùng", `Bạn có chắc chắn muốn chặn ${name}? Hai người sẽ không thể nhắn tin hay xem thông tin của nhau.`, [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn", style: "destructive", onPress: () => {
            blockUser(id, {
              onSuccess: () => {
                refetch();
                Alert.alert("Thành công", "Đã chặn người dùng");
              }
            });
          }
        }
      ]);
    }
  };

  if (isLoading || !user) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  const name = formatFullName(user.firstName, user.lastName);

  return (
    <View className="flex-1 bg-white">
      {/* Absolute Header overlay */}
      <View className="absolute top-12 left-4 z-10 flex-row items-center">
        <TouchableOpacity
          className="bg-black/30 w-10 h-10 rounded-full items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false}>
        {/* Cover Image Placeholder */}
        <View className="h-64 bg-gray-200 w-full relative overflow-hidden">
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809" }} // Generic background
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        {/* Profile Info */}
        <View className="px-4 pb-6 border-b border-gray-100 bg-white">
          <View className="flex-row items-end justify-between -mt-12 mb-4">
            <View className="bg-white p-1 rounded-full relative">
              <Image
                source={{ uri: getAvatarUrl(name, user.avatarUrl) }}
                className="w-24 h-24 rounded-full bg-gray-100"
              />
              {user.online && (
                <View className="absolute bottom-1 right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
              )}
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-2xl font-JakartaBold text-gray-800">{name}</Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-col gap-3">
            {blockStatus === 'BLOCKED_BY_THEM' ? (
              <View className="bg-gray-100 p-3 rounded-xl items-center">
                <Text className="text-gray-400 font-JakartaMedium text-sm italic">
                  Bạn không thể tương tác với người dùng này
                </Text>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 items-center justify-center flex-row bg-[#0068FF] rounded-full py-3"
                  onPress={handleStartChat}
                  disabled={isStartingChat || blockStatus === 'BLOCKED_BY_ME'}
                  style={{ opacity: blockStatus === 'BLOCKED_BY_ME' ? 0.5 : 1 }}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                  <Text className="text-white font-JakartaMedium ml-2">Nhắn tin</Text>
                </TouchableOpacity>

                {friendStatus === 'PENDING_RECEIVED' ? (
                  <View className="flex-row gap-2 flex-1">
                    <TouchableOpacity
                      className="flex-1 bg-green-500 py-3 rounded-full items-center justify-center flex-row"
                      onPress={handleAccept}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="white" />
                      <Text className="text-white font-JakartaMedium ml-1.5 text-xs">Đồng ý</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-gray-100 py-3 rounded-full items-center justify-center flex-row"
                      onPress={handleReject}
                    >
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                      <Text className="text-red-500 font-JakartaMedium ml-1.5 text-xs">Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`flex-1 items-center justify-center flex-row rounded-full py-3 ${friendStatus === 'ACCEPTED'
                        ? 'bg-gray-100'
                        : friendStatus === 'PENDING_SENT'
                          ? 'bg-orange-50'
                          : 'bg-blue-50'
                      }`}
                    onPress={handleFriendAction}
                    disabled={isSendingReq || isUnfriending || friendStatus === 'PENDING_SENT' || blockStatus === 'BLOCKED_BY_ME'}
                    style={{ opacity: blockStatus === 'BLOCKED_BY_ME' ? 0.5 : 1 }}
                  >
                    {isSendingReq || isUnfriending ? (
                      <ActivityIndicator color="#0068FF" />
                    ) : friendStatus === 'ACCEPTED' ? (
                      <>
                        <Ionicons name="person-remove" size={20} color="#EF4444" />
                        <Text className="text-red-500 font-JakartaMedium ml-2">Hủy kết bạn</Text>
                      </>
                    ) : friendStatus === 'PENDING_SENT' ? (
                      <>
                        <Ionicons name="time" size={20} color="#F97316" />
                        <Text className="text-orange-500 font-JakartaMedium ml-2">Đã gửi yêu cầu</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="person-add" size={20} color="#0068FF" />
                        <Text className="text-blue-500 font-JakartaMedium ml-2">Kết bạn</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Block & Report actions row (hidden if self) */}
            {user.id !== id && (
              <View className="flex-row gap-3 border-t border-gray-100 pt-3">
                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center py-2.5 rounded-full border ${blockStatus === 'BLOCKED_BY_ME'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-100'
                    }`}
                  onPress={handleBlockAction}
                >
                  <Ionicons
                    name={blockStatus === 'BLOCKED_BY_ME' ? "shield" : "shield-outline"}
                    size={16}
                    color={blockStatus === 'BLOCKED_BY_ME' ? "#22C55E" : "#EF4444"}
                  />
                  <Text
                    className={`font-JakartaMedium ml-2 text-xs ${blockStatus === 'BLOCKED_BY_ME' ? 'text-green-600' : 'text-red-500'
                      }`}
                  >
                    {blockStatus === 'BLOCKED_BY_ME' ? 'Bỏ chặn' : 'Chặn'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center bg-gray-50 border border-gray-200 py-2.5 rounded-full"
                  onPress={() => setShowReport(true)}
                >
                  <Ionicons name="flag-outline" size={16} color="#6B7280" />
                  <Text className="text-gray-600 font-JakartaMedium ml-2 text-xs">Tố cáo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Details Section */}
        <View className="mt-2 bg-white">
          <View className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <Text className="font-JakartaBold text-gray-700">Thông tin cá nhân</Text>
          </View>

          <View className="px-4 py-4 border-b border-gray-50 flex-row">
            <Text className="w-24 text-gray-400 font-JakartaMedium">Email</Text>
            <Text className="flex-1 font-Jakarta text-gray-800">{user.email}</Text>
          </View>

          <View className="px-4 py-4 border-b border-gray-50 flex-row">
            <Text className="w-24 text-gray-400 font-JakartaMedium">Tình trạng</Text>
            <Text className="flex-1 font-Jakarta text-gray-800">
              {user.online ? 'Đang hoạt động' : (user.lastSeen ? `Truy cập ${(() => {
                const parsed = parseBackendDate(user.lastSeen);
                return parsed ? parsed.toLocaleDateString('vi-VN') : 'Offline';
              })()}` : 'Offline')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetId={id}
        type="USER"
      />
    </View>
  );
}
