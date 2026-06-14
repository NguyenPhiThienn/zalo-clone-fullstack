// app/(auth)/sign-up.tsx — Đăng ký tài khoản Zalo Clone
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
import { register, verifyEmail } from "@/api/auth";

const SignUp = () => {
  const [step, setStep] = useState(1); // 1: Register, 2: OTP
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "", 
    confirmPassword: "", 
    otp: "" 
  });

  const [alertModal, setAlertModal] = useState({ visible: false, title: "", message: "" });
  const showAlert = (title: string, message: string) => setAlertModal({ visible: true, title, message });

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.firstName) {
      showAlert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (form.password.length < 6) {
      showAlert("Lỗi", "Mật khẩu phải từ 6 ký tự.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      showAlert("Lỗi", "Xác nhận mật khẩu không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setStep(2);
      showAlert("Thành công", "Vui lòng kiểm tra mã OTP trong Email của bạn.");
    } catch (error: any) {
      showAlert("Lỗi đăng ký", error.message || "Email đã tồn tại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!form.otp) return;
    setIsLoading(true);
    try {
      await verifyEmail({ email: form.email, code: form.otp });
      // Chuyển hướng về sign-in với tham báo thành công
      router.replace({ 
        pathname: "/(auth)/sign-in", 
        params: { success: "signup" } 
      });
    } catch (error: any) {
      showAlert("Lỗi OTP", "Mã xác thực không chính xác.");
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
                {step === 1 ? "Tạo tài khoản" : "Xác thực OTP"}
              </Text>
              <Text className="text-gray-500 font-JakartaMedium mb-6 text-center">
                {step === 1 ? "Nhập thông tin để bắt đầu hành trình Zalo Clone" : `Mã OTP đã được gửi tới ${form.email}`}
              </Text>
              <Image source={images.signUpCuate} className="h-44 w-full" resizeMode="contain" />
            </View>

            <View className="mt-4 flex-1">
              {step === 1 ? (
                <>
                  <View className="flex-row gap-3">
                    <View className="flex-1"><InputField label="Họ" placeholder="VD: Nguyễn" value={form.firstName} onChangeText={(v: string) => setForm({ ...form, firstName: v })} /></View>
                    <View className="flex-1"><InputField label="Tên" placeholder="VD: Văn A" value={form.lastName} onChangeText={(v: string) => setForm({ ...form, lastName: v })} /></View>
                  </View>
                  <InputField label="Email" placeholder="example@gmail.com" value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v.trim() })} icon="mail-outline" />
                  <InputField label="Mật khẩu" placeholder="Tối thiểu 6 ký tự" value={form.password} onChangeText={(v: string) => setForm({ ...form, password: v })} secureTextEntry icon="lock-closed-outline" />
                  <InputField label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChangeText={(v: string) => setForm({ ...form, confirmPassword: v })} secureTextEntry icon="shield-checkmark-outline" />
                  <CustomButton title="TIẾP TỤC" onPress={handleRegister} loading={isLoading} className="mt-4" />
                </>
              ) : (
                <>
                  <InputField label="Mã xác thực OTP" placeholder="6 chữ số" value={form.otp} onChangeText={(v: string) => setForm({ ...form, otp: v.trim() })} keyboardType="numeric" icon="key-outline" />
                  <CustomButton title="XÁC THỰC" onPress={handleVerify} loading={isLoading} className="mt-4" />
                  <TouchableOpacity onPress={() => setStep(1)} className="mt-4 items-center"><Text className="text-gray-500 font-JakartaBold">Quay lại đăng ký</Text></TouchableOpacity>
                </>
              )}

              <View className="flex-row justify-center items-center mt-6 mb-8">
                <Text className="text-gray-500 font-JakartaMedium">Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}><Text className="text-primary-500 font-JakartaBold">Đăng nhập</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <CustomModal visible={alertModal.visible} title={alertModal.title} message={alertModal.message} onClose={() => setAlertModal({ ...alertModal, visible: false })} />
    </View>
  );
};

export default SignUp;
