import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContacts } from "@/hooks/useFriend";
import { UserDto } from "@/api/user";
import { createGroup } from "@/api/group";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseBackendDate, getAvatarUrl } from "@/lib/utils";

const CreateGroupScreen = () => {
    const queryClient = useQueryClient();
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const [activeTab, setActiveTab] = useState<"recent" | "contacts">("recent");

    const { data: users, isLoading } = useContacts();

    const toggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
            return;
        }
        if (selectedUsers.length < 2 && !__DEV__) { // Allowing <2 for dev testing if they just want to see it work
            Alert.alert("Lỗi", "Nhóm phải có ít nhất 2 thành viên khác");
            return;
        }

        setIsCreating(true);
        try {
            const group = await createGroup({
                name: groupName,
                memberIds: selectedUsers,
            });
            // Cập nhật React Query cache trực tiếp tránh Redis cache cũ từ BE
            queryClient.setQueryData(['groups'], (old: any[] | undefined) => {
                const currentList = old ? [...old] : [];
                if (currentList.some(g => g.id === group.id)) return old;
                const initializedGroup = {
                    ...group,
                    lastMessageTime: group.lastMessageTime || new Date().toISOString()
                };
                return [initializedGroup, ...currentList];
            });
            Alert.alert("Thành công", "Đã tạo nhóm chat mới");
            router.replace({
                pathname: "/(root)/chat/[id]",
                params: { id: group.id, name: group.name, isGroup: "true" }
            });
        } catch (error) {
            console.error("Create group error:", error);
            Alert.alert("Lỗi", "Không thể tạo nhóm lúc này");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <SafeAreaView edges={["top"]} className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 bg-white">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <View className="ml-4 flex-1">
                    <Text className="text-gray-800 text-[17px] font-JakartaBold">Nhóm mới</Text>
                    <Text className="text-gray-500 text-[13px] font-Jakarta">Đã chọn: {selectedUsers.length}</Text>
                </View>
            </View>

            {/* Group Name input */}
            <View className="px-4 py-2 flex-row items-center">
                <View className="w-[46px] h-[46px] bg-gray-100 rounded-full items-center justify-center border border-gray-200">
                    <Ionicons name="camera" size={24} color="#9ca3af" />
                </View>
                <TextInput
                    className="flex-1 ml-4 text-[17px] font-JakartaMedium border-b border-white hover:border-gray-200"
                    placeholder="Đặt tên nhóm"
                    placeholderTextColor="#6B7280"
                    value={groupName}
                    onChangeText={setGroupName}
                />
            </View>

            {/* Search Input */}
            <View className="px-4 mt-2">
                <View className="flex-row items-center bg-gray-100 rounded-full px-3 h-10">
                    <Ionicons name="search" size={20} color="#6B7280" />
                    <TextInput 
                        className="flex-1 ml-2 font-Jakarta text-[15px]"
                        placeholder="Tìm tên hoặc số điện thoại"
                        placeholderTextColor="#6B7280"
                    />
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row mt-3 border-b border-gray-200">
                <TouchableOpacity 
                    className={`flex-1 items-center pb-2 ${activeTab === 'recent' ? 'border-b-2 border-gray-800' : ''}`}
                    onPress={() => setActiveTab('recent')}
                >
                    <Text className={`font-JakartaBold text-[13px] ${activeTab === 'recent' ? 'text-gray-800' : 'text-gray-500'}`}>GẦN ĐÂY</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    className={`flex-1 items-center pb-2 ${activeTab === 'contacts' ? 'border-b-2 border-gray-800' : ''}`}
                    onPress={() => setActiveTab('contacts')}
                >
                    <Text className={`font-JakartaBold text-[13px] ${activeTab === 'contacts' ? 'text-gray-800' : 'text-gray-500'}`}>DANH BẠ</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0068FF" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isSelected = selectedUsers.includes(item.id);
                        return (
                        <TouchableOpacity
                            className="flex-row items-center px-4 py-3 border-b border-gray-50"
                            onPress={() => toggleUser(item.id)}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{ uri: getAvatarUrl(`${item.firstName || ""} ${item.lastName || ""}`.trim(), item.avatarUrl) }}
                                className="w-[50px] h-[50px] rounded-full"
                            />
                            <View className="ml-4 flex-1">
                                <Text className="font-Jakarta Medium text-[16px] text-gray-800 mb-[2px]">
                                    {item.firstName} {item.lastName}
                                </Text>
                                <Text className="text-gray-500 text-[13px] font-Jakarta">
                                    {item.online ? 'Vừa mới truy cập' : item.lastSeen ? (() => {
                                        const parsed = parseBackendDate(item.lastSeen);
                                        return parsed ? parsed.toLocaleDateString('vi-VN') : '1 ngày trước';
                                    })() : '1 ngày trước'}
                                </Text>
                            </View>
                            <View className={`w-[22px] h-[22px] rounded-full border items-center justify-center ${isSelected ? 'border-[#0068FF] bg-[#0068FF]' : 'border-gray-400 bg-white'}`}>
                                {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                            </View>
                        </TouchableOpacity>
                    )}}
                />
            )}

            {selectedUsers.length > 0 && (
                <View className="absolute bottom-6 right-6">
                    <TouchableOpacity 
                        className="w-14 h-14 bg-[#0068FF] rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
                        onPress={handleCreate}
                        disabled={isCreating}
                    >
                        {isCreating ? <ActivityIndicator color="white" /> : <Ionicons name="arrow-forward" size={26} color="white" />}
                    </TouchableOpacity>
                </View>
            )}

            {isCreating && (
                <View className="absolute inset-0 bg-black/20 justify-center items-center">
                    <View className="bg-white p-6 rounded-2xl items-center">
                        <ActivityIndicator size="large" color="#0068FF" />
                        <Text className="mt-4 font-JakartaBold text-gray-800">Đang tạo nhóm...</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default CreateGroupScreen;
