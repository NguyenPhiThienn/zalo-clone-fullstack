import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  usePendingRequests,
  useSentRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest
} from "@/hooks/useFriend";
import { getAvatarUrl, formatFullName, parseBackendDate } from "@/lib/utils";
import { StatusBar } from "expo-status-bar";

export default function FriendRequestsScreen() {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const { data: pendingRequests, isLoading: loadingPending } = usePendingRequests();
  const { data: sentRequests, isLoading: loadingSent } = useSentRequests();

  const { mutate: acceptReq, isPending: accepting } = useAcceptFriendRequest();
  const { mutate: rejectReq, isPending: rejecting } = useRejectFriendRequest();

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} className="bg-[#0068FF]" />

      {/* Header */}
      <View className="flex-row items-center px-4 h-14 bg-[#0068FF]">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-JakartaMedium text-lg flex-1">Lời mời kết bạn</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${activeTab === 'received' ? 'border-b-2 border-[#0068FF]' : ''}`}
          onPress={() => setActiveTab('received')}
        >
          <Text className={`font-JakartaMedium ${activeTab === 'received' ? 'text-[#0068FF]' : 'text-gray-500'}`}>Đã nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${activeTab === 'sent' ? 'border-b-2 border-[#0068FF]' : ''}`}
          onPress={() => setActiveTab('sent')}
        >
          <Text className={`font-JakartaMedium ${activeTab === 'sent' ? 'text-[#0068FF]' : 'text-gray-500'}`}>Đã gửi</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'received' && (
        loadingPending ? (
          <View className="flex-1 justify-center items-center"><ActivityIndicator color="#0068FF" /></View>
        ) : pendingRequests?.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 font-Jakarta">Không có lời mời nào</Text>
          </View>
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const name = item.senderName;
              return (
                <View className="flex-row items-center px-4 py-3 border-b border-gray-50">
                  <TouchableOpacity onPress={() => router.push({ pathname: "/(root)/user/[id]", params: { id: item.senderId } })}>
                    <Image source={{ uri: getAvatarUrl(name, item.senderAvatarUrl) }} className="w-14 h-14 rounded-full bg-gray-200" />
                  </TouchableOpacity>
                  <View className="flex-1 ml-3">
                    <TouchableOpacity onPress={() => router.push({ pathname: "/(root)/user/[id]", params: { id: item.senderId } })}>
                      <Text className="text-base font-JakartaMedium">{name}</Text>
                    </TouchableOpacity>
                    <Text className="text-xs text-gray-400 mt-1">{(() => {
                      const parsed = parseBackendDate(item.createdDate);
                      return parsed ? parsed.toLocaleDateString('vi-VN') : '';
                    })()}</Text>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        disabled={accepting || rejecting}
                        className="flex-1 bg-gray-100 py-1.5 rounded-full items-center"
                        onPress={() => rejectReq(item.id)}
                      >
                        <Text className="font-JakartaMedium text-gray-700">Từ chối</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={accepting || rejecting}
                        className="flex-1 bg-[#0068FF]/10 py-1.5 rounded-full items-center"
                        onPress={() => acceptReq(item.id)}
                      >
                        <Text className="font-JakartaMedium text-[#0068FF]">Đồng ý</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      )}

      {activeTab === 'sent' && (
        loadingSent ? (
          <View className="flex-1 justify-center items-center"><ActivityIndicator color="#0068FF" /></View>
        ) : sentRequests?.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 font-Jakarta">Không có lời mời nào</Text>
          </View>
        ) : (
          <FlatList
            data={sentRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const name = item.receiverName;
              return (
                <View className="flex-row items-center px-4 py-3 border-b border-gray-50">
                  <TouchableOpacity onPress={() => router.push({ pathname: "/(root)/user/[id]", params: { id: item.receiverId } })}>
                    <Image source={{ uri: getAvatarUrl(name, item.receiverAvatarUrl) }} className="w-14 h-14 rounded-full bg-gray-200" />
                  </TouchableOpacity>
                  <View className="flex-1 ml-3">
                    <TouchableOpacity onPress={() => router.push({ pathname: "/(root)/user/[id]", params: { id: item.receiverId } })}>
                      <Text className="text-base font-JakartaMedium">{name}</Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        disabled={rejecting}
                        className="bg-red-50 px-4 py-1.5 rounded-full border border-red-100"
                        onPress={() => {
                          Alert.alert("Hủy lời mời", "Bạn có chắc chắn muốn thu hồi lời mời này?", [
                            { text: "Không", style: "cancel" },
                            { text: "Hủy lời mời", style: "destructive", onPress: () => rejectReq(item.id) }
                          ]);
                        }}
                      >
                        <Text className="font-JakartaMedium text-red-500">Hủy lời mời</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      )}
    </View>
  );
}
