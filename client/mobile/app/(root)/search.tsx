import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { searchUsers, UserDto } from "@/api/user";
import { getAvatarUrl, formatFullName } from "@/lib/utils";

const SearchScreen = () => {
    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<UserDto[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (text: string) => {
        setKeyword(text);
        if (text.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const data = await searchUsers(text);
            setResults(data);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = (userId: string) => {
        router.push({ pathname: "/(root)/user/[id]", params: { id: userId } });
    };

    return (
        <SafeAreaView edges={["top"]} className="flex-1 bg-[#0068FF]">
            <View className="flex-row items-center px-4 py-2 h-[52px]">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View className="flex-1 flex-row items-center ml-3 px-2 h-full">
                    <Ionicons name="search" size={22} color="white" />
                    <TextInput
                        className="flex-1 ml-3 font-JakartaMedium text-[17px] text-white py-1"
                        placeholder="Tìm kiếm"
                        placeholderTextColor="rgba(255,255,255,0.7)"
                        value={keyword}
                        onChangeText={handleSearch}
                        autoFocus
                        cursorColor="white"
                    />
                    {keyword.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch("")}>
                            <Ionicons name="close" size={22} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View className="flex-1 bg-white pt-2">
                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#0068FF" />
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const name = formatFullName(item.firstName, item.lastName);
                            return (
                                <TouchableOpacity
                                    className="flex-row items-center px-4 py-3 border-b border-gray-50"
                                    onPress={() => handleUserPress(item.id)}
                                >
                                    <Image
                                        source={{ uri: getAvatarUrl(name, item.avatarUrl) }}
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <View className="ml-3">
                                        <Text className="font-JakartaBold text-base text-gray-800">
                                            {name}
                                        </Text>
                                        <Text className="text-gray-500 text-sm font-JakartaMedium">
                                            {item.email}
                                        </Text>
                                    </View>
                                    <View className="flex-1" />
                                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            )
                        }}
                    />
                ) : keyword.length >= 2 ? (
                    <View className="flex-1 justify-center items-center px-10">
                        <Ionicons name="person-add-outline" size={64} color="#e5e7eb" />
                        <Text className="text-gray-400 text-center mt-4 font-JakartaMedium">
                            Không tìm thấy người dùng phù hợp với email này
                        </Text>
                    </View>
                ) : (
                    <View className="p-4 bg-white">
                        <Text className="text-gray-400 font-JakartaMedium text-sm">Gợi ý: Tìm tên hoặc email (từ 2 ký tự)</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

export default SearchScreen;
