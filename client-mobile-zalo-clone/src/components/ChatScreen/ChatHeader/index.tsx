import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getImageUrl, getAvatarUrl } from '@/lib/utils';
import { StatusBar } from 'expo-status-bar';

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string | null;
  online?: boolean;
  lastSeenText?: string;
  isGroup?: boolean;
  groupId?: string;
  onPressSummarize?: () => void;
  loadingSummarize?: boolean;
}

const ChatHeader = ({ name, avatarUrl, online, lastSeenText, isGroup, groupId, onPressSummarize, loadingSummarize }: ChatHeaderProps) => {
  const router = useRouter();
  const avatar = getAvatarUrl(name, avatarUrl);

  const handlePressInfo = () => {
    if (isGroup && groupId) {
      router.push(`/(root)/group-info?id=${groupId}` as any);
    } else if (!isGroup && groupId) {
      // Navigate to user profile
      router.push(`/(root)/user/${groupId}` as any);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.wrapper}>
      {/* Hiện lại thanh trạng thái chuẩn */}
      <StatusBar style="light" backgroundColor="#0068FF" />

      <View style={styles.container}>
        {/* Nút Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>

        {/* Ảnh đại diện */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePressInfo}>
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
          />
          {online && <View style={styles.onlineDot} />}
        </TouchableOpacity>

        {/* Thông tin tên & trạng thái */}
        <TouchableOpacity style={styles.info} onPress={handlePressInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.status} numberOfLines={1}>
            {isGroup ? 'Nhấn để xem thông tin nhóm' : (online ? 'Đang hoạt động' : (lastSeenText || 'Vừa mới truy cập'))}
          </Text>
        </TouchableOpacity>

        {/* Các nút Call/Video/Menu */}
        <View style={styles.actions}>
          {onPressSummarize && (
            <TouchableOpacity style={styles.iconBtn} onPress={onPressSummarize} disabled={loadingSummarize}>
              {loadingSummarize ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="sparkles" size={20} color="white" />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="call-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="videocam-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => {
              if (isGroup && groupId) {
                router.push({
                  pathname: "/(root)/group-storage",
                  params: { id: groupId, name: name }
                });
              }
            }}
          >
            <Ionicons name="list-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0068FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  backBtn: { padding: 4, marginRight: 4 },
  avatarWrapper: { position: 'relative', marginRight: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#0068FF'
  },
  info: { flex: 1 },
  name: {
    color: 'white',
    fontFamily: 'Jakarta-Bold',
    fontSize: 17
  },
  status: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Jakarta-Medium',
    fontSize: 11,
    marginTop: 1
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
});

export default ChatHeader;
