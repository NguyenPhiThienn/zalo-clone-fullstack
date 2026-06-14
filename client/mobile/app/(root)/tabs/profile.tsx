// app/(root)/tabs/profile.tsx — Quản lý hồ sơ chuyên nghiệp
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { changePassword, uploadAvatar } from "@/api/user";
import CustomModal from "@/components/Common/CustomModal";
import CustomButton from "@/components/Common/CustomButton";
import InputField from "@/components/Common/InputField";
import { getAvatarUrl, formatFullName } from "@/lib/utils";
import MainHeader from "@/components/Common/MainHeader";

const ProfileScreen = () => {
  const { logout, hasHydrated } = useAuth();
  const { data: profile, isLoading, refetch, isError } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();

  const [refreshing, setRefreshing] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Modals visibility
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Form states
  const [passForm, setPassForm] = useState({ current: "", new: "", confirm: "" });
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(false);

  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) =>
    setAlertModal({ visible: true, title, message });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    logout();
    router.replace("/(auth)/sign-in");
  };

  const handleUpdatePassword = async () => {
    if (!passForm.current || passForm.new.length < 6) {
      showAlert("Lỗi", "Mật khẩu mới phải từ 6 ký tự.");
      return;
    }
    if (passForm.new !== passForm.confirm) {
      showAlert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: passForm.current,
        newPassword: passForm.new,
      });
      setShowPasswordModal(false);
      setPassForm({ current: "", new: "", confirm: "" });
      showAlert("Thành công", "Mật khẩu đã được thay đổi.");
    } catch (err: any) {
      showAlert("Lỗi", err?.message || "Mật khẩu hiện tại không đúng.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = () => {
    if (!profileForm.firstName.trim()) return;
    updateProfile(
      { firstName: profileForm.firstName, lastName: profileForm.lastName },
      {
        onSuccess: () => {
          setShowEditProfileModal(false);
          showAlert("Thành công", "Thông tin đã được cập nhật.");
        },
      }
    );
  };

  // Đợi nạp Token từ kho lưu trữ xong mới xử lý tiếp
  if (!hasHydrated || (isLoading && !refreshing)) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  // Xử lý khi không lấy được dữ liệu Profile (Lỗi mạng hoặc Token hết hạn)
  if (isError && !profile) {
    return (
      <View className="flex-1 bg-gray-50">
        <MainHeader title="Cá nhân" showSearch={true} />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="cloud-offline-outline" size={64} color="#CBD5E1" />
          <Text className="text-gray-500 font-JakartaMedium text-center mt-4">
            Không thể tải thông tin. Vui lòng kiểm tra kết nối mạng.
          </Text>
          <TouchableOpacity onPress={onRefresh} className="mt-6 bg-primary-500 px-8 py-3 rounded-full">
            <Text className="text-white font-JakartaBold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const name = formatFullName(profile?.firstName, profile?.lastName || "");

  return (
    <View className="flex-1 bg-gray-50">
      <MainHeader title="Cá nhân" showSearch={true} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0068FF"]} />}
      >
        {/* Profile Card */}
        <View className="items-center mt-6 px-4">
          <View className="bg-white w-full rounded-3xl p-6 shadow-sm items-center">
            <TouchableOpacity onPress={() => router.push('/(root)/personal-wall')} className="relative" activeOpacity={0.8}>
              <Image
                source={{ 
                  uri: getAvatarUrl(
                    formatFullName(profile?.firstName, profile?.lastName || ""), 
                    profile?.avatarUrl
                  )
                }}
                className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-sm"
              />
            </TouchableOpacity>

            <Text className="text-2xl font-JakartaBold text-gray-800 mt-4">{name}</Text>
            <Text className="text-gray-500 font-JakartaMedium">{profile?.email}</Text>

            <View className="flex-row mt-6 w-full gap-3">
              <TouchableOpacity
                onPress={() => {
                  setProfileForm({ firstName: profile?.firstName || "", lastName: profile?.lastName || "" });
                  setShowEditProfileModal(true);
                }}
                className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
              >
                <Text className="font-JakartaBold text-gray-700">Sửa hồ sơ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                className="flex-1 bg-red-50 py-3 rounded-xl items-center"
              >
                <Text className="font-JakartaBold text-red-500">Đăng xuất</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Settings Menu */}
        <View className="px-4 mt-6 mb-10">
          <Text className="text-gray-500 font-JakartaBold mb-3 ml-1">CÀI ĐẶT TÀI KHOẢN</Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <MenuItem
              icon="lock-closed-outline"
              label="Thay đổi mật khẩu"
              onPress={() => setShowPasswordModal(true)}
            />
            <Divider />
            <MenuItem
              icon="shield-outline"
              label="Danh sách chặn"
              onPress={() => router.push("/(root)/blocked-list" as any)}
            />
            <Divider />
            <MenuItem icon="notifications-outline" label="Thông báo" onPress={() => showAlert("Thông báo", "Đang phát triển")} />
            <Divider />
            <MenuItem icon="shield-checkmark-outline" label="Quyền riêng tư" onPress={() => showAlert("Bảo mật", "Đang phát triển")} />
            <Divider />
            <MenuItem icon="help-circle-outline" label="Trợ giúp & Hỗ trợ" onPress={() => showAlert("Hỗ trợ", "Email: help@zaloclone.vn")} />
          </View>
        </View>
      </ScrollView>

      {/* ── Modal Đổi mật khẩu ── */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl p-6 pb-12">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-JakartaBold">Đổi mật khẩu</Text>
                  <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                    <Ionicons name="close" size={26} color="gray" />
                  </TouchableOpacity>
                </View>
                <InputField
                  label="Mật khẩu hiện tại"
                  placeholder="Nhập mật khẩu cũ"
                  secureTextEntry
                  value={passForm.current}
                  onChangeText={(v: string) => setPassForm({ ...passForm, current: v })}
                />
                <InputField
                  label="Mật khẩu mới"
                  placeholder="Tối thiểu 6 ký tự"
                  secureTextEntry
                  value={passForm.new}
                  onChangeText={(v: string) => setPassForm({ ...passForm, new: v })}
                />
                <InputField
                  label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  secureTextEntry
                  value={passForm.confirm}
                  onChangeText={(v: string) => setPassForm({ ...passForm, confirm: v })}
                />
                <CustomButton title="CẬP NHẬT MẬT KHẨU" onPress={handleUpdatePassword} loading={loading} className="mt-4" />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal Sửa Profile ── */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl p-6 pb-12">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-JakartaBold">Chỉnh sửa hồ sơ</Text>
                  <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                    <Ionicons name="close" size={26} color="gray" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <InputField
                      label="Họ"
                      value={profileForm.firstName}
                      onChangeText={(v: string) => setProfileForm({ ...profileForm, firstName: v })}
                    />
                  </View>
                  <View className="flex-1">
                    <InputField
                      label="Tên"
                      value={profileForm.lastName}
                      onChangeText={(v: string) => setProfileForm({ ...profileForm, lastName: v })}
                    />
                  </View>
                </View>
                <CustomButton title="LƯU THAY ĐỔI" onPress={handleUpdateProfile} className="mt-4" />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <CustomModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
      />
    </View>
  );
};

const MenuItem = ({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-4 active:bg-gray-50">
    <View className="bg-blue-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
      <Ionicons name={icon} size={20} color="#0068FF" />
    </View>
    <Text className="flex-1 font-JakartaMedium text-gray-700 text-base">{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

const Divider = () => <View className="h-[1px] bg-gray-100 mx-4" />;

export default ProfileScreen;
