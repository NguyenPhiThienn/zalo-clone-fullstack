// app/(root)/tabs/home.tsx
import React from "react";
import { View } from "react-native";
import MainHeader from "@/components/Common/MainHeader";
import ConversationList from "@/components/HomeScreen/ConversationList";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <MainHeader showSearch={true} />
      <ConversationList />
    </View>
  );
}
