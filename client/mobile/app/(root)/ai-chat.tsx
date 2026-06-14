import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAiHistory, useChatWithAi, useClearAiHistory } from "@/hooks/useAi";
import { useAuth } from "@/context/AuthContext";
import { formatTimeVN } from "@/lib/utils";

const AiChatScreen = () => {
  const [inputText, setInputText] = useState("");
  const { data: historyData, isLoading: loadingHistory } = useAiHistory();
  const { mutate: sendMessage, isPending: isSending } = useChatWithAi();
  const { mutate: clearHistory } = useClearAiHistory();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const messages = historyData?.content || [];

  const handleSend = () => {
    if (!inputText.trim() || isSending) return;
    const msg = inputText.trim();
    setInputText("");
    sendMessage(msg);
  };

  const handleClear = () => {
    clearHistory();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Blue Header with SafeArea top edge */}
      <View className="bg-[#0068FF]">
        <SafeAreaView edges={['top']} />
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="relative">
              <Image
                source={{ uri: "https://api.dicebear.com/9.x/bottts/png?seed=ZaloAI&backgroundColor=b6e3f4" }}
                className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white/20"
              />
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0068FF]" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-JakartaBold text-white">Trợ lý Zalo Clone AI</Text>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-400 mr-1.5" />
                <Text className="text-xs text-blue-100 font-JakartaMedium">Đang trực tuyến</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={handleClear} className="p-2">
            <Ionicons name="trash-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
          renderItem={({ item }) => (
            <View
              className={`mb-4 flex-row ${item.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              {item.role === "assistant" && (
                <Image
                  source={{ uri: "https://api.dicebear.com/9.x/bottts/png?seed=ZaloAI&backgroundColor=b6e3f4" }}
                  className="w-8 h-8 rounded-full bg-blue-100 mr-2 self-end"
                />
              )}
              <View
                style={{
                  maxWidth: '80%',
                  paddingHorizontal: 12,
                  paddingTop: 8,
                  paddingBottom: 4,
                  borderRadius: 18,
                  borderWidth: 0.5,
                  backgroundColor: item.role === "user" ? "#EAF6FF" : "#FFFFFF",
                  borderColor: item.role === "user" ? "#D5E9F7" : "#E1E6E9",
                  borderBottomRightRadius: item.role === "user" ? 4 : 18,
                  borderBottomLeftRadius: item.role === "user" ? 18 : 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Jakarta',
                    lineHeight: 22,
                    color: '#1F2937'
                  }}
                >
                  {item.content}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: item.role === "user" ? "#6B7280" : "#94A3B8" }}>
                    {formatTimeVN(item.createdDate)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          inverted
          ListFooterComponent={
            loadingHistory ? (
              <ActivityIndicator size="small" color="#0068FF" />
            ) : null
          }
        />

        {/* Typing indicator */}
        {isSending && (
          <View className="px-6 py-2 flex-row items-center">
            <View className="bg-white border border-gray-100 rounded-2xl px-4 py-2 flex-row items-center shadow-sm">
              <ActivityIndicator size="small" color="#0068FF" className="mr-2" />
              <Text className="text-gray-400 text-xs font-Jakarta">AI đang suy nghĩ...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View className="bg-white border-t border-gray-100 px-4 pt-3 pb-8">
          <View className="flex-row items-center bg-gray-50 rounded-full px-4 border border-gray-200">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Hỏi AI bất cứ điều gì..."
              className="flex-1 py-3 text-base font-Jakarta"
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              className={`ml-2 w-10 h-10 items-center justify-center rounded-full ${inputText.trim() && !isSending ? 'bg-[#0068FF]' : 'bg-gray-200'}`}
            >
              <Ionicons name="send" size={20} color={inputText.trim() && !isSending ? "white" : "#94A3B8"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AiChatScreen;
