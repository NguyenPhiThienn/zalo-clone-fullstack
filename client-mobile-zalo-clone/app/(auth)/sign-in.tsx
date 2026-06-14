// app/(auth)/sign-in.tsx — Đăng nhập Zalo
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
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import CustomButton from "@/components/Common/CustomButton";
import CustomModal from "@/components/Common/CustomModal";
import InputField from "@/components/Common/InputField";
import { images } from "@/constants";
import { useAuth } from "@/context/AuthContext";

const SignIn = () => {
  const { login } = useAuth();
  const { success } = useLocalSearchParams<{ success: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ account?: string; password?: string }>({});

  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  useEffect(() => {
    if (success === "signup") {
      showAlert("Đăng ký thành công", "Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập ngay!");
    } else if (success === "reset") {
      showAlert("Thành công", "Mật khẩu của bạn đã được đặt lại. Hãy dùng mật khẩu mới để đăng nhập.");
    }
  }, [success]);

  const handleLogin = async () => {
    setErrors({});
    if (!account || !account.includes("@")) {
      setErrors({ account: "Email không hợp lệ" });
      return;
    }
    if (!password) {
      setErrors({ password: "Vui lòng nhập mật khẩu" });
      return;
    }

    setIsLoading(true);
    try {
      await login(account, password);
      router.replace("/(root)/tabs/home");
    } catch (error: any) {
      showAlert("Lỗi", error.message || "Tài khoản hoặc mật khẩu không đúng");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header màu xanh chuẩn Zalo */}
      <View className="bg-primary-500">
        <StatusBar style="light" />
        <SafeAreaView edges={["top"]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            className="px-6 pb-5"
            showsVerticalScrollIndicator={false}
          >
            {/* Nội dung Logo */}
            <View className="items-center mt-8">
              <View className="bg-primary-500 p-2 rounded-2xl mb-4">
                <Text className="text-3xl font-JakartaBold text-white px-4">Zalo Clone</Text>
              </View>
              <Image
                source={images.signUpCuate}
                className="h-52 w-full"
                resizeMode="contain"
              />
            </View>

            <View className="mt-6 mb-8 items-center">
              <Text className="text-2xl text-gray-800 font-JakartaBold">Đăng nhập</Text>
              <Text className="text-gray-500 font-JakartaMedium mt-1">Kết nối cùng bạn bè và người thân</Text>
            </View>

            <View className="flex-1">
              <InputField
                label="Email"
                placeholder="example@gmail.com"
                value={account}
                onChangeText={setAccount}
                icon="mail-outline"
                error={errors.account}
              />

              <InputField
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon="lock-closed-outline"
                error={errors.password}
              />

              <TouchableOpacity
                className="self-end mb-6"
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text className="text-primary-500 font-JakartaBold">Quên mật khẩu?</Text>
              </TouchableOpacity>

              <CustomButton title="ĐĂNG NHẬP" onPress={handleLogin} loading={isLoading} />

              <View className="flex-row justify-center items-center mt-6">
                <Text className="text-gray-500 font-JakartaMedium">Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                  <Text className="text-primary-500 font-JakartaBold">Đăng ký</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CustomModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
      />
    </View>
  );
};

export default SignIn;
