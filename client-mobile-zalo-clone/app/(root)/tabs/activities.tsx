import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useContacts, usePendingRequests } from "@/hooks/useFriend";
import { useStartChat } from "@/hooks/useChat";
import { UserDto } from "@/api/user";
import { ChatDto } from "@/api/chat";
import { router } from "expo-router";
import MainHeader from "@/components/Common/MainHeader";
import { getAvatarUrl, formatFullName } from "@/lib/utils";
import { useMyGroups } from "@/hooks/useGroup";

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");

  const { data: contacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useContacts();
  const { data: pendingRequests } = usePendingRequests();
  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useMyGroups();
  const { mutate: startChat } = useStartChat();

  const handleStartChat = (userId: string, name: string) => {
    startChat(userId, {
      onSuccess: (chat: ChatDto) => {
        router.push({
          pathname: "/(root)/chat/[id]",
          params: { id: chat.id, name: name }
        });
      },
    });
  };

  const renderFriendRequestsItem = () => {
    const pendingCount = pendingRequests?.length || 0;
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-4 border-b border-gray-100 bg-white"
        onPress={() => router.push("/(root)/friend-requests")}
      >
        <View className="w-12 h-12 rounded-xl bg-[#0068FF] justify-center items-center">
          <Ionicons name="person-add" size={24} color="white" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-JakartaMedium text-base text-gray-800">Lời mời kết bạn</Text>
        </View>
        {pendingCount > 0 && (
          <View className="bg-red-500 rounded-full min-w-[20px] h-5 justify-center items-center px-1">
            <Text className="text-white text-xs font-JakartaBold">{pendingCount > 99 ? '99+' : pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAiChatButton = () => (
    <TouchableOpacity
      className="flex-row items-center px-4 py-4 border-b border-gray-100 bg-white"
      onPress={() => router.push("/(root)/ai-chat")}
    >
      <View className="w-12 h-12 rounded-xl bg-[#7C3AED] justify-center items-center shadow-lg shadow-purple-500/50">
        <Ionicons name="sparkles" size={24} color="white" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-JakartaBold text-base text-[#7C3AED]">Zalo Clone AI Assistant</Text>
        <Text className="font-Jakarta text-sm text-gray-400">Trợ lý AI thông minh của bạn</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const renderPhonebookItem = () => (
    <TouchableOpacity className="flex-row items-center px-4 py-4 border-b-4 border-gray-100 bg-white">
      <View className="w-12 h-12 rounded-xl bg-[#22C55E] justify-center items-center">
        <Ionicons name="call" size={24} color="white" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-JakartaMedium text-base text-gray-800">Danh bạ máy</Text>
        <Text className="font-Jakarta text-sm text-gray-500">Các liên hệ có dùng Zalo</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <MainHeader title="Danh bạ" showSearch={true} />

      {/* Top Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${activeTab === 'friends' ? 'border-b-2 border-[#0068FF]' : ''}`}
          onPress={() => setActiveTab('friends')}
        >
          <Text className={`font-JakartaMedium ${activeTab === 'friends' ? 'text-[#0068FF]' : 'text-gray-500'}`}>Bạn bè</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${activeTab === 'groups' ? 'border-b-2 border-[#0068FF]' : ''}`}
          onPress={() => setActiveTab('groups')}
        >
          <Text className={`font-JakartaMedium ${activeTab === 'groups' ? 'text-[#0068FF]' : 'text-gray-500'}`}>Nhóm</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'friends' ? (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isLoadingContacts} onRefresh={refetchContacts} />}
          ListHeaderComponent={
            <View>
              {renderAiChatButton()}
              {renderFriendRequestsItem()}
              {renderPhonebookItem()}
              <View className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <Text className="font-JakartaBold text-gray-800 text-sm">
                  {contacts?.length || 0} bạn bè
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const name = formatFullName(item.firstName, item.lastName);
            return (
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/(root)/user/[id]", params: { id: item.id } })}
                className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white"
              >
                <View className="relative">
                  <Image
                    source={{ uri: getAvatarUrl(name, item.avatarUrl) }}
                    className="w-12 h-12 rounded-full border border-gray-200"
                  />
                  {item.online && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-JakartaMedium text-gray-800 text-base">
                    {name}
                  </Text>
                </View>
                <View className="flex-row gap-4">
                  <TouchableOpacity onPress={() => handleStartChat(item.id, name)}>
                    <Ionicons name="chatbubble-outline" size={24} color="#0068FF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isLoadingGroups} onRefresh={refetchGroups} />}
          ListHeaderComponent={
            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b-4 border-gray-100 bg-white"
              onPress={() => router.push("/(root)/create-group")}
            >
              <View className="w-12 h-12 rounded-xl bg-gray-100 justify-center items-center border border-dashed border-gray-300">
                <Ionicons name="people" size={24} color="#0068FF" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-JakartaMedium text-base text-[#0068FF]">Tạo nhóm mới</Text>
              </View>
            </TouchableOpacity>
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: "/(root)/chat/[id]",
                    params: { id: item.id, name: item.name, isGroup: "true" }
                  });
                }}
                className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white"
              >
                <View className="relative">
                  <Image
                    source={{ uri: item.avatarUrl || "https://zalo-api.zadn.vn/api/emoticon/sprite?eid=eb&length=1" }} // placeholder for group avatar
                    className="w-12 h-12 rounded-full border border-gray-200 bg-gray-200"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-JakartaMedium text-gray-800 text-base">
                    {item.name}
                  </Text>
                  <Text className="font-Jakarta text-sm text-gray-500">
                    {item.members.length} thành viên
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text className="font-JakartaMedium text-gray-500">Bạn chưa tham gia nhóm nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
