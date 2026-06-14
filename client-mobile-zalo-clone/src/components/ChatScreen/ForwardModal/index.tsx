import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChats } from '@/hooks/useChat';
import { useMyGroups } from '@/hooks/useGroup';
import { useSendMessage } from '@/hooks/useMessages';
import { useSendGroupMessage } from '@/hooks/useGroup';
import { getAvatarUrl } from '@/lib/utils';

interface ForwardModalProps {
  visible: boolean;
  onClose: () => void;
  messageContent: string;
  messageType: string;
  mediaUrl?: string;
}

type Target = { id: string; name: string; avatar?: string | null; isGroup: boolean };

const ForwardModal = ({ visible, onClose, messageContent, messageType, mediaUrl }: ForwardModalProps) => {
  const { data: chats, isLoading: loadingChats } = useChats();
  const { data: groups, isLoading: loadingGroups } = useMyGroups();
  const { mutate: sendPrivate } = useSendMessage();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isLoading = loadingChats || loadingGroups;

  const allTargets: Target[] = [
    ...(chats || []).map(c => ({ id: c.id, name: c.chatName || c.recipientEmail || 'Chat', avatar: c.avatarUrl, isGroup: false })),
    ...(groups || []).map(g => ({ id: g.id, name: g.name, avatar: g.avatarUrl, isGroup: true })),
  ];

  const handleForward = () => {
    if (selectedIds.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một cuộc trò chuyện');
      return;
    }

    selectedIds.forEach(targetId => {
      const target = allTargets.find(t => t.id === targetId);
      if (!target) return;
      if (target.isGroup) {
        // group forward via REST (hook inline)
        import('@/api/group').then(({ sendGroupMessage }) => {
          sendGroupMessage(targetId, { content: messageContent, type: messageType as any, mediaUrl } as any);
        });
      } else {
        sendPrivate({ chatId: targetId, content: messageContent, type: messageType as any, mediaUrl });
      }
    });

    Alert.alert('Thành công', `Đã chuyển tiếp đến ${selectedIds.length} cuộc trò chuyện`);
    setSelectedIds([]);
    onClose();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const renderItem = ({ item }: { item: Target }) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleSelect(item.id)}
        className="flex-row items-center px-6 py-3 border-b border-gray-50"
      >
        <View className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {selected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
        <Image
          source={{ uri: getAvatarUrl(item.name, item.avatar) }}
          className="w-12 h-12 rounded-full mr-4"
        />
        <View className="flex-1">
          <Text className="text-base font-JakartaMedium text-gray-800" numberOfLines={1}>
            {item.isGroup ? `👥 ${item.name}` : item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 text-lg">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-xl font-JakartaBold">Chuyển tiếp</Text>
            <TouchableOpacity onPress={handleForward}>
              <Text className={`font-JakartaBold text-lg ${selectedIds.length > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                Gửi {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {isLoading ? (
            <ActivityIndicator className="mt-20" color="#0068FF" />
          ) : (
            <FlatList
              data={allTargets}
              keyExtractor={(item) => (item.isGroup ? `g-${item.id}` : `c-${item.id}`)}
              renderItem={renderItem}
              ListEmptyComponent={
                <Text className="text-center mt-20 text-gray-400">Không tìm thấy cuộc trò chuyện nào</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ForwardModal;
