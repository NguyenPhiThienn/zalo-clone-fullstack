import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSummarizeGroup } from '@/hooks/useAi';

interface MissedMessagesBannerProps {
  groupId: string;
  count: number;
  onClose: () => void;
  onSummaryReady: (summary: string, stats: any) => void;
}

const MissedMessagesBanner = ({ groupId, count, onClose, onSummaryReady }: MissedMessagesBannerProps) => {
  const { mutate: summarize, isPending } = useSummarizeGroup();

  const handleSummarize = () => {
    // Tóm tắt từ 24h trước hoặc tùy chỉnh dựa trên logic unread
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    summarize(
      { groupId, since },
      {
        onSuccess: (data: any) => {
          onSummaryReady(data.summary, {
            messageCount: data.messageCount,
            topSpeakers: data.topSpeakers
          });
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Ionicons name="sparkles" size={16} color="#0068FF" />
          <Text style={styles.title}>{count} tin nhắn mới</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.content}
        onPress={handleSummarize}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#0068FF" />
        ) : (
          <>
            <Text style={styles.description}>
              Xem tóm tắt bằng AI để nắm bắt nhanh nội dung bạn đã bỏ lỡ
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#0068FF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Jakarta-Bold',
    color: '#1E40AF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  description: {
    fontSize: 13,
    color: '#3B82F6',
    fontFamily: 'Jakarta-Medium',
    flex: 1,
    marginRight: 8,
  },
});

export default MissedMessagesBanner;
