// app/(root)/tabs/notifications.tsx
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MainHeader from "@/components/Common/MainHeader";

export default function DiscoverScreen() {
  return (
    <View className="flex-1 bg-white">
      <MainHeader title="Khám phá" showSearch={true} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="items-center mt-20">
          <Ionicons name="grid-outline" size={60} color="#CBD5E1" />
          <Text className="text-gray-400 font-JakartaBold text-lg mt-4">
            Tính năng đang phát triển
          </Text>
          <Text className="text-gray-400 font-JakartaMedium text-center mt-2 px-10">
            Hãy quay lại sau để trải nghiệm những tính năng mới nhất từ Zalo Clone.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
