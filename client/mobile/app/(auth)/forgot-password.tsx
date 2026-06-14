// app/(auth)/forgot-password.tsx — Khôi phục mật khẩu Zalo Clone
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";

import CustomButton from "@/components/Common/CustomButton";
import CustomModal from "@/components/Common/CustomModal";
import InputField from "@/components/Common/InputField";
import { images } from "@/constants";
import { forgotPassword, resetPassword } from "@/api/auth";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Pass
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });

  const [alertModal, setAlertModal] = useState({ visible: false, title: "", message: "" });
  const showAlert = (title: string, message: string) => setAlertModal({ visible: true, title, message });

  const handleRequestOtp = async () => {
    if (!form.email || !form.email.includes("@")) {
      showAlert("Lỗi", "Vui lòng nhập email hợp lệ.");
      return;
    }
    setIsLoading(true);
    try {
      await forgotPassword({ email: form.email });
      setStep(2);
      showAlert("Thành công", "Mã khôi phục đã được gửi tới Email của bạn.");
    } catch (error: any) {
      showAlert("Lỗi", "Không tìm thấy tài khoản với email này.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!form.otp || form.newPassword.length < 6) {
      showAlert("Lỗi", "Vui lòng nhập đầy đủ mã và mật khẩu mới (tối thiểu 6 ký tự).");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      showAlert("Lỗi", "Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        email: form.email,
        code: form.otp,
        newPassword: form.newPassword,
      });
      // Điều hướng về sign-in kèm param thông báo
      router.replace({ 
        pathname: "/(auth)/sign-in", 
        params: { success: "reset" } 
      });
    } catch (error: any) {
      showAlert("Lỗi", "Mã xác thực không chính xác hoặc hết hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="bg-primary-500">
        <StatusBar style="light" />
        <SafeAreaView edges={["top"]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pb-5" showsVerticalScrollIndicator={false}>
            <View className="items-center mt-6">
              <Text className="text-3xl font-JakartaBold text-primary-500 mb-2">
                {step === 1 ? "Quên mật khẩu" : "Đặt lại mật khẩu"}
              </Text>
              <Text className="text-gray-500 font-JakartaMedium mb-6 text-center text-lg">
                {step === 1 ? "Nhập email của bạn để nhận mã khôi phục" : "Vui lòng nhập mã OTP và mật khẩu mới"}
              </Text>
              <Image source={images.signUpCuate} className="h-48 w-full" resizeMode="contain" />
            </View>

            <View className="mt-6 flex-1">
              {step === 1 ? (
                <>
                  <InputField label="Email tài khoản" placeholder="example@gmail.com" value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v.trim() })} icon="mail-outline" />
                  <CustomButton title="GỬI MÃ XÁC THỰC" onPress={handleRequestOtp} loading={isLoading} className="mt-4" />
                </>
              ) : (
                <>
                  <InputField label="Mã OTP" placeholder="Nhập 6 chữ số từ email" value={form.otp} onChangeText={(v: string) => setForm({ ...form, otp: v.trim() })} keyboardType="numeric" icon="key-outline" />
                  <InputField label="Mật khẩu mới" placeholder="Tối thiểu 6 ký tự" value={form.newPassword} onChangeText={(v: string) => setForm({ ...form, newPassword: v })} secureTextEntry icon="lock-closed-outline" />
                  <InputField label="Xác nhận mật khẩu mới" placeholder="Nhập lại mật khẩu mới" value={form.confirmPassword} onChangeText={(v: string) => setForm({ ...form, confirmPassword: v })} secureTextEntry icon="shield-checkmark-outline" />
                  <CustomButton title="ĐẶT LẠI MẬT KHẨU" onPress={handleReset} loading={isLoading} className="mt-4" />
                </>
              )}

              <TouchableOpacity onPress={() => router.back()} className="mt-6 items-center"><Text className="text-primary-500 font-JakartaBold">Quay lại</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <CustomModal visible={alertModal.visible} title={alertModal.title} message={alertModal.message} onClose={() => setAlertModal({ ...alertModal, visible: false })} />
    </View>
  );
};

export default ForgotPassword;
