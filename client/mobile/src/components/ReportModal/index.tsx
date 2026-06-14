import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCreateReport } from '@/hooks/useReport';
import { useAuth } from '@/context/AuthContext';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  type: 'USER' | 'MESSAGE' | 'GROUP';
}

const REASONS = [
  'Nội dung nhạy cảm',
  'Quấy rối',
  'Lừa đảo',
  'Spam',
  'Ngôn ngữ thù ghét',
  'Khác'
];

const ReportModal = ({ visible, onClose, targetId, type }: ReportModalProps) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { user } = useAuth();
  const { mutate: createReport, isPending } = useCreateReport();

  const handleSubmit = () => {
    if (!reason) {
      Alert.alert('Thông báo', 'Vui lòng chọn lý do tố cáo');
      return;
    }

    createReport(
      { 
        userId: user?.id || '', 
        payload: { reason, description, type, targetId } 
      },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét sớm nhất có thể.');
          onClose();
          setReason('');
          setDescription('');
        },
        onError: () => {
          Alert.alert('Lỗi', 'Không thể gửi báo cáo lúc này');
        }
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Tố cáo {type === 'USER' ? 'người dùng' : (type === 'MESSAGE' ? 'tin nhắn' : 'nhóm')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Lý do phổ biến:</Text>
          <View style={styles.reasonsContainer}>
            {REASONS.map((r) => (
              <TouchableOpacity 
                key={r} 
                style={[styles.reasonPill, reason === r && styles.selectedPill]}
                onPress={() => setReason(r)}
              >
                <Text style={[styles.reasonText, reason === r && styles.selectedReasonText]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Mô tả chi tiết (không bắt buộc):</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholder="Nhập thêm chi tiết về vi phạm..."
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.submitBtn, !reason && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={isPending || !reason}
          >
            {isPending ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Gửi báo cáo</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Jakarta-Bold',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Jakarta-Bold',
    color: '#4B5563',
    marginBottom: 12,
    marginTop: 8,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPill: {
    backgroundColor: '#0068FF',
    borderColor: '#0068FF',
  },
  reasonText: {
    fontSize: 13,
    color: '#374151',
  },
  selectedReasonText: {
    color: 'white',
    fontFamily: 'Jakarta-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#0068FF',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#9CA3AF',
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Jakarta-Bold',
  },
});

export default ReportModal;
