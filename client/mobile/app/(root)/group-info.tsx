// app/(root)/group-info.tsx — Màn hình quản lý nhóm đầy đủ
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StatusBar,
  TextInput, Alert, ActivityIndicator, StyleSheet, Platform, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  useGroupById, useUpdateGroup, useUploadGroupAvatar,
  useAddGroupMembers, useRemoveGroupMember as useRemoveMember, useSetGroupAdmin,
  useLeaveGroup, useDissolveGroup, useCreateJoinRequests,
  useJoinRequests, useApproveJoinRequest, useRejectJoinRequest
} from '@/hooks/useGroup';
import { useSummarizeGroup } from '@/hooks/useAi';
import ReportModal from '@/components/ReportModal';
import { getMemberName } from '@/api/group';
import { useAuth } from '@/context/AuthContext';
import { getAvatarUrl, parseBackendDate } from '@/lib/utils';
import { useContacts } from '@/hooks/useFriend';

export interface GroupJoinRequestDto {
  id: string;
  groupId: string;
  requestedById: string;
  requestedByName: string;
  requestedByAvatarUrl: string | null;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatarUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdDate: string;
}

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group, isLoading, refetch } = useGroupById(id);
  const { data: contacts } = useContacts();

  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSelectAdmin, setShowSelectAdmin] = useState(false);

  const { mutate: updateName, isPending: updatingName } = useUpdateGroup(id);
  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useUploadGroupAvatar(id);
  const { mutate: addMembers, isPending: addingMembers } = useAddGroupMembers(id);
  const { mutate: createJoinRequests, isPending: creatingRequests } = useCreateJoinRequests(id);
  const { data: requests, refetch: refetchRequests } = useJoinRequests(id);
  const { mutate: approveRequest } = useApproveJoinRequest(id);
  const { mutate: rejectRequest } = useRejectJoinRequest(id);

  const { mutate: removeMember } = useRemoveMember(id);
  const { mutate: setAdmin } = useSetGroupAdmin(id);
  const { mutate: leaveGroup, isPending: leaving } = useLeaveGroup();
  const { mutate: dissolveGroup, isPending: dissolving } = useDissolveGroup();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const { mutate: summarize, isPending: summarizing } = useSummarizeGroup();

  const handleSummarize = () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    summarize({ groupId: id, since }, {
      onSuccess: (data) => setSummaryData(data),
      onError: () => Alert.alert('Lỗi', 'Không thể tạo tóm tắt'),
    });
  };

  // BE trả về isAdmin trực tiếp trong GroupDto
  const isAdmin = group?.isAdmin ?? false;
  const admins = (group?.members || []).filter(m => m.admin);
  const isMeOnlyAdmin = isAdmin && admins.length === 1;
  const hasOtherMembers = (group?.members || []).length > 1;
  const isLastAdmin = isMeOnlyAdmin && hasOtherMembers;
  const nonAdminMembers = (group?.members || []).filter(m => m.userId !== user?.id && !m.admin);
  const memberIds = (group?.members || []).map(m => m.userId);

  // Danh sách bạn bè có thể thêm
  const friendsNotInGroup = (contacts || []).filter(c => !memberIds.includes(c.id));

  const handlePickAvatar = async () => {
    if (!isAdmin) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      uploadAvatar(formData, {
        onSuccess: () => { refetch(); Alert.alert('Thành công', 'Đã cập nhật ảnh nhóm'); },
        onError: () => Alert.alert('Lỗi', 'Không thể cập nhật ảnh nhóm'),
      });
    }
  };

  const handleSaveName = () => {
    if (!newName.trim()) return;
    updateName(newName.trim(), {
      onSuccess: () => { setEditName(false); refetch(); },
      onError: () => Alert.alert('Lỗi', 'Không thể cập nhật tên nhóm'),
    });
  };

  const handleRemoveMember = (userId: string, name: string) => {
    Alert.alert('Xóa thành viên', `Xóa ${name} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: () => removeMember(userId, {
          onSuccess: () => {
            refetch();
            Alert.alert('Thành công', `Đã xóa ${name}`);
          },
          onError: (err: any) => Alert.alert('Lỗi', err.message || 'Không thể xóa thành viên'),
        }),
      },
    ]);
  };

  const handleSetAdmin = (userId: string, name: string) => {
    Alert.alert('Gán quyền', `Gán quyền admin cho ${name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: () => setAdmin(userId, {
          onSuccess: () => { refetch(); Alert.alert('Thành công', `${name} đã là admin`); },
          onError: () => Alert.alert('Lỗi', 'Không thể gán quyền'),
        }),
      },
    ]);
  };

  const handleLeave = () => {
    if (isLastAdmin) {
      setShowSelectAdmin(true);
      return;
    }

    Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm', style: 'destructive',
        onPress: () => leaveGroup({ groupId: id }, {
          onSuccess: () => {
            router.replace('/(root)/tabs/home');
          },
          onError: () => Alert.alert('Lỗi', 'Không thể rời nhóm'),
        }),
      },
    ]);
  };

  const handleLeaveWithNewAdmin = (newAdminId: string) => {
    leaveGroup({ groupId: id, newAdminId }, {
      onSuccess: () => {
        setShowSelectAdmin(false);
        router.replace('/(root)/tabs/home');
      },
      onError: (err: any) => {
        Alert.alert('Lỗi', err.message || 'Không thể rời nhóm');
      },
    });
  };

  const handleDissolve = () => {
    Alert.alert('Giải tán nhóm', 'Hành động này không thể hoàn tác!', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Giải tán', style: 'destructive',
        onPress: () => dissolveGroup(id, {
          onSuccess: () => {
            router.replace('/(root)/tabs/home');
          },
          onError: () => Alert.alert('Lỗi', 'Không thể giải tán nhóm'),
        }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0068FF" />
      </SafeAreaView>
    );
  }

  if (!group) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />

      {/* Header chuẩn Zalo - Tràn viền */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin nhóm</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & Tên nhóm */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={!isAdmin}>
            <Image
              source={{ uri: getAvatarUrl(group.name, group.avatarUrl) }}
              style={styles.groupAvatar}
            />
            {isAdmin && (
              <View style={styles.cameraIcon}>
                {uploadingAvatar
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="camera" size={16} color="white" />}
              </View>
            )}
          </TouchableOpacity>

          {editName ? (
            <View style={styles.editNameRow}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={styles.nameInput}
                autoFocus
                placeholder="Nhập tên nhóm..."
              />
              <TouchableOpacity onPress={handleSaveName} disabled={updatingName} style={styles.saveBtn}>
                {updatingName
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={{ color: 'white', fontFamily: 'Jakarta-Bold' }}>Lưu</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditName(false)} style={[styles.saveBtn, { backgroundColor: '#9CA3AF', marginLeft: 6 }]}>
                <Text style={{ color: 'white', fontFamily: 'Jakarta-Bold' }}>Hủy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => { if (isAdmin) { setNewName(group.name); setEditName(true); } }}
            >
              <Text style={styles.groupName}>{group.name}</Text>
              {isAdmin && <Ionicons name="pencil" size={16} color="#6B7280" style={{ marginLeft: 6 }} />}
            </TouchableOpacity>
          )}
          <Text style={styles.memberCount}>{group.members.length} thành viên</Text>
        </View>

        {/* Nút hành động nhanh */}
        <View style={styles.quickActions}>
          <QuickAction icon="chatbubble-outline" label="Nhắn tin" onPress={() => router.back()} />
          <QuickAction
            icon="sparkles-outline"
            label="Tóm tắt AI"
            onPress={handleSummarize}
            loading={summarizing}
          />
          <QuickAction icon="person-add-outline" label="Thêm" onPress={() => setShowAddMember(true)} />
        </View>

        {/* Yêu cầu phê duyệt (Chỉ Admin thấy) */}
        {isAdmin && requests && requests.length > 0 && (
          <View style={[styles.section, { backgroundColor: '#F0F9FF', borderLeftWidth: 4, borderLeftColor: '#0068FF' }]}>
            <Text style={[styles.sectionTitle, { color: '#0068FF' }]}>Yêu cầu phê duyệt ({requests.length})</Text>
            {requests.map((req) => (
              <View key={req.id} style={styles.requestRow}>
                <Image
                  source={{ uri: getAvatarUrl(req.targetUserName, req.targetUserAvatarUrl) }}
                  style={styles.memberAvatar}
                />
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.requestMainText}>
                    <Text style={{ fontFamily: 'Jakarta-Bold' }}>{req.requestedByName}</Text> mời <Text style={{ fontFamily: 'Jakarta-Bold' }}>{req.targetUserName}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    Vào {(() => {
                      const parsed = parseBackendDate(req.createdDate);
                      return parsed ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    })()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity 
                    onPress={() => approveRequest(req.id, { onSuccess: () => { refetch(); refetchRequests(); } })}
                    style={styles.approveBtnSmall}
                  >
                    <Text style={styles.btnTextSmall}>Duyệt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => rejectRequest(req.id, { onSuccess: () => { refetchRequests(); } })}
                    style={styles.rejectBtnSmall}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Danh sách thành viên */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành viên ({group.members.length})</Text>
          {group.members.map((member, index) => {
            const isMemberAdmin = member.admin;
            const isMe = member.userId === user?.id;
            const displayName = getMemberName(member);
            return (
              <View key={member.userId || `member-${index}`} style={styles.memberRow}>
                <Image
                  source={{ uri: getAvatarUrl(displayName, member.avatarUrl) }}
                  style={styles.memberAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{isMe ? 'Bạn' : displayName}</Text>
                  {isMemberAdmin && (
                    <Text style={styles.adminBadge}>👑 Trưởng nhóm</Text>
                  )}
                </View>
                {isAdmin && !isMe && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {!isMemberAdmin && (
                      <TouchableOpacity
                        onPress={() => handleSetAdmin(member.userId, displayName)}
                        style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]}
                      >
                        <Ionicons name="shield-outline" size={20} color="#F59E0B" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.userId, displayName)}
                      style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                    >
                      <Ionicons name="remove-circle-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Hành động nguy hiểm */}
        <View style={[styles.section, { marginTop: 8, paddingBottom: 60 }]}>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleLeave}
            disabled={leaving}
          >
            <View style={[styles.actionBtn, { backgroundColor: '#FEE2E2', marginRight: 12 }]}>
              <Ionicons name="exit-outline" size={22} color="#EF4444" />
            </View>
            <Text style={styles.dangerText}>{leaving ? 'Đang rời...' : 'Rời nhóm'}</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.dangerBtn, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12 }]}
              onPress={handleDissolve}
              disabled={dissolving}
            >
              <View style={[styles.actionBtn, { backgroundColor: '#F3F4F6', marginRight: 12 }]}>
                <Ionicons name="trash-outline" size={22} color="#4B5563" />
              </View>
              <Text style={[styles.dangerText, { color: '#4B5563' }]}>{dissolving ? 'Đang giải tán...' : 'Giải tán nhóm'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.dangerBtn, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', marginTop: 12, paddingTop: 12 }]}
            onPress={() => setShowReport(true)}
          >
            <View style={[styles.actionBtn, { backgroundColor: '#FEF3C7', marginRight: 12 }]}>
              <Ionicons name="warning-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.dangerText, { color: '#F59E0B' }]}>Tố cáo nhóm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal hiển thị tóm tắt AI */}
      <Modal visible={!!summaryData} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={24} color="#0068FF" />
              <Text style={styles.summaryTitle}>Tóm tắt hội thoại (24h)</Text>
              <TouchableOpacity onPress={() => setSummaryData(null)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.summaryBody}>{summaryData?.summary}</Text>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryMetaRow}>
                <Ionicons name="chatbubbles-outline" size={16} color="#6B7280" />
                <Text style={styles.summaryMetaText}>Tổng số tin nhắn: {summaryData?.messageCount}</Text>
              </View>

              <Text style={[styles.summaryLabel, { marginTop: 12 }]}>Thành viên tích cực:</Text>
              <View style={styles.speakerList}>
                {(summaryData?.topSpeakers || []).map((s: string, i: number) => (
                  <View key={i} style={styles.speakerItem}>
                    <Text style={styles.speakerText}>{s}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetId={id}
        type="GROUP"
      />

      {/* Modal thêm thành viên */}
      <AddMemberModal
        visible={showAddMember}
        friends={friendsNotInGroup}
        onClose={() => setShowAddMember(false)}
        onAdd={(ids) => {
          if (isAdmin) {
            addMembers(ids, {
              onSuccess: () => { setShowAddMember(false); refetch(); Alert.alert('Thành công', 'Đã thêm thành viên'); },
              onError: (err: any) => Alert.alert('Lỗi', err.message || 'Không thể thêm thành viên'),
            });
          } else {
            createJoinRequests(ids, {
              onSuccess: () => { setShowAddMember(false); Alert.alert('Đã gửi yêu cầu', 'Yêu cầu của bạn đã được gửi tới trưởng nhóm duyệt.'); },
              onError: (err: any) => Alert.alert('Lỗi', err.message || 'Không thể gửi yêu cầu'),
            });
          }
        }}
        isPending={addingMembers || creatingRequests}
      />

      <SelectNewAdminModal
        visible={showSelectAdmin}
        members={nonAdminMembers}
        onClose={() => setShowSelectAdmin(false)}
        onConfirm={handleLeaveWithNewAdmin}
        isPending={leaving}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const QuickAction = ({ icon, label, onPress, loading }: { icon: any; label: string; onPress: () => void; loading?: boolean }) => (
  <TouchableOpacity style={styles.quickBtn} onPress={onPress} disabled={loading}>
    <View style={styles.quickIcon}>
      {loading ? <ActivityIndicator size="small" color="#0068FF" /> : <Ionicons name={icon} size={22} color="#0068FF" />}
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const AddMemberModal = ({
  visible, friends, onClose, onAdd, isPending,
}: {
  visible: boolean;
  friends: any[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  isPending: boolean;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredFriends = friends.filter(f => {
    const fullName = `${f.firstName || ''} ${f.lastName || ''}`.trim().toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#6B7280', fontSize: 16 }}>Hủy</Text></TouchableOpacity>
            <Text style={{ fontFamily: 'Jakarta-Bold', fontSize: 17 }}>Thêm thành viên</Text>
            <TouchableOpacity onPress={() => onAdd(selected)} disabled={selected.length === 0 || isPending}>
              <Text style={{ color: selected.length > 0 ? '#0068FF' : '#D1D5DB', fontFamily: 'Jakarta-Bold', fontSize: 16 }}>
                {isPending ? 'Đang thêm...' : `Thêm${selected.length > 0 ? ` (${selected.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thanh tìm kiếm */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: 'white' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Tìm bạn bè..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Jakarta', color: '#1F2937' }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Danh sách */}
          {friends.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontFamily: 'Jakarta-Medium' }}>Bạn chưa có bạn bè hoặc tất cả đã trong nhóm</Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#9CA3AF', fontFamily: 'Jakarta-Medium' }}>Không tìm thấy bạn bè nào</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item, index) => item.id ? `friend-${item.id}` : `friend-idx-${index}`}
              renderItem={({ item }) => {
                const sel = selected.includes(item.id);
                const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
                return (
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}
                  >
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginRight: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? '#0068FF' : 'transparent', borderColor: sel ? '#0068FF' : '#D1D5DB' }}>
                      {sel && <Ionicons name="checkmark" size={15} color="white" />}
                    </View>
                    <Image source={{ uri: getAvatarUrl(fullName, item.avatarUrl) }} style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'Jakarta-Medium', fontSize: 15, color: '#1F2937' }}>{fullName}</Text>
                      {item.email && fullName !== item.email && <Text style={{ fontFamily: 'Jakarta', fontSize: 12, color: '#9CA3AF' }}>{item.email}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0068FF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 16,
    position: 'relative'
  },
  headerBackBtn: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontFamily: 'Jakarta-Bold',
    fontSize: 18,
    textAlign: 'center'
  },
  avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: 'white', marginBottom: 8 },
  groupAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E5E7EB' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0068FF', borderRadius: 12, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  groupName: { fontSize: 20, fontFamily: 'Jakarta-Bold', color: '#1F2937' },
  memberCount: { fontSize: 13, color: '#9CA3AF', fontFamily: 'Jakarta-Medium', marginTop: 4 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 24 },
  nameInput: { flex: 1, borderBottomWidth: 2, borderBottomColor: '#0068FF', paddingVertical: 6, paddingHorizontal: 8, fontSize: 16, fontFamily: 'Jakarta', color: '#1F2937' },
  saveBtn: { backgroundColor: '#0068FF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  quickActions: { flexDirection: 'row', justifyContent: 'center', gap: 32, backgroundColor: 'white', paddingVertical: 16, marginBottom: 8 },
  quickBtn: { alignItems: 'center', gap: 6 },
  quickIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: '#374151' },
  section: { backgroundColor: 'white', marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 13, fontFamily: 'Jakarta-Bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', marginRight: 12 },
  memberName: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: '#1F2937' },
  adminBadge: { fontSize: 11, color: '#F59E0B', fontFamily: 'Jakarta-Medium', marginTop: 2 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  dangerText: { fontSize: 15, fontFamily: 'Jakarta-Medium', color: '#EF4444' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  summaryBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Jakarta-Bold',
    color: '#1F2937',
  },
  summaryBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontFamily: 'Jakarta',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryMetaText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Jakarta-Medium',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Jakarta-Bold',
    color: '#4B5563',
    marginBottom: 8,
  },
  speakerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speakerItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speakerText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Jakarta-Medium',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BAE6FD',
  },
  requestMainText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  approveBtnSmall: {
    backgroundColor: '#0068FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rejectBtnSmall: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextSmall: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Jakarta-Bold',
  },
});

const SelectNewAdminModal = ({
  visible, members, onClose, onConfirm, isPending
}: {
  visible: boolean;
  members: any[];
  onClose: () => void;
  onConfirm: (userId: string) => void;
  isPending: boolean;
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: '#6B7280', fontSize: 16 }}>Hủy</Text></TouchableOpacity>
            <Text style={{ fontFamily: 'Jakarta-Bold', fontSize: 17 }}>Chọn admin mới</Text>
            <TouchableOpacity onPress={() => selected && onConfirm(selected)} disabled={!selected || isPending}>
              <Text style={{ color: selected ? '#EF4444' : '#D1D5DB', fontFamily: 'Jakarta-Bold', fontSize: 16 }}>
                {isPending ? 'Đang rời...' : 'Rời nhóm'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, color: '#4B5563', fontFamily: 'Jakarta-Medium', marginBottom: 12 }}>
              Bạn là admin duy nhất của nhóm. Hãy chỉ định một thành viên làm admin mới trước khi rời nhóm.
            </Text>
          </View>

          {/* Danh sách thành viên */}
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => {
              const isSelected = selected === item.userId;
              const displayName = getMemberName(item);
              return (
                <TouchableOpacity
                  onPress={() => setSelected(item.userId)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}
                >
                  <Image
                    source={{ uri: getAvatarUrl(displayName, item.avatarUrl) }}
                    style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Jakarta-Medium', color: '#1F2937' }}>
                    {displayName}
                  </Text>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#0068FF' : 'transparent', borderColor: isSelected ? '#0068FF' : '#D1D5DB' }}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};
