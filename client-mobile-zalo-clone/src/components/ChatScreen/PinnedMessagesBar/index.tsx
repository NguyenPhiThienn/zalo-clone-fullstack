import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePinnedGroupMessages, useUnpinGroupMessage } from '@/hooks/useGroup';
import { GroupMessageDto } from '@/api/group';

interface PinnedMessagesBarProps {
  groupId: string;
  isAdmin: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

const PinnedMessagesBar = ({ groupId, isAdmin, onScrollToMessage }: PinnedMessagesBarProps) => {
  const { data: pinnedMessages = [] } = usePinnedGroupMessages(groupId);
  const { mutate: unpin } = useUnpinGroupMessage(groupId);
  const [showAll, setShowAll] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const currentPin = pinnedMessages[0];

  return (
    <View style={styles.container}>
      <Ionicons name="pin" size={16} color="#0068FF" style={styles.pinIcon} />

      <TouchableOpacity
        style={styles.content}
        onPress={() => {
          if (pinnedMessages.length === 1) {
            onScrollToMessage?.(currentPin.id!);
          } else {
            setShowAll(true);
          }
        }}
      >
        <Text style={styles.label} numberOfLines={1}>
          Tin nhắn đã ghim {pinnedMessages.length > 1 ? `(${pinnedMessages.length})` : ''}
        </Text>
        <Text style={styles.messageText} numberOfLines={1}>
          {currentPin.type === 'SYSTEM' ? currentPin.content : (currentPin.content || '[Hình ảnh/Tệp tin]')}
        </Text>
      </TouchableOpacity>

      {isAdmin && currentPin?.id && (
        <TouchableOpacity style={styles.closeBtn} onPress={() => unpin(currentPin.id!)}>
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}

      {/* Modal hiển thị tất cả ghim */}
      <Modal visible={showAll} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAll(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh sách ghim ({pinnedMessages.length})</Text>
              <TouchableOpacity onPress={() => setShowAll(false)}>
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pinList}>
              {pinnedMessages.map((msg: GroupMessageDto) => (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.pinItem}
                  onPress={() => {
                    setShowAll(false);
                    onScrollToMessage?.(msg.id!);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinSender}>{msg.senderName || 'Thành viên'}</Text>
                    <Text style={styles.pinText}>{msg.content || '[Media]'}</Text>
                  </View>
                  {isAdmin && msg.id && (
                    <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); unpin(msg.id!); }}>
                      <Text style={{ color: '#EF4444', fontSize: 13 }}>Bỏ ghim</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pinIcon: { marginRight: 8 },
  content: { flex: 1 },
  label: {
    fontSize: 12,
    fontFamily: 'Jakarta-Bold',
    color: '#0068FF',
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '60%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Jakarta-Bold',
  },
  pinList: { flexGrow: 0 },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pinSender: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Jakarta-Medium',
  },
  pinText: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 2,
  },
});

export default PinnedMessagesBar;
