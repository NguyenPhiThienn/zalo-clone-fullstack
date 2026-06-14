import React from "react";
import { View, Text, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/Common/CustomButton";

export interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

const CustomModal = ({ visible, title, message, onClose, primaryButtonText = "Đóng", secondaryButtonText, onSecondaryPress }: CustomModalProps) => {
  const isSuccess = title.toLowerCase().includes("thành công");
  const isDanger = title.toLowerCase().includes("lỗi") || title.toLowerCase().includes("đăng xuất");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white rounded-3xl w-full p-4 items-center shadow-xl">
          <View
            className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isSuccess ? "bg-green-100" : isDanger ? "bg-red-100" : "bg-blue-100"
              }`}
          >
            <Ionicons
              name={isSuccess ? "checkmark-circle" : isDanger ? "alert-circle" : "information-circle"}
              size={36}
              color={isSuccess ? "#10B981" : isDanger ? "#EF4444" : "#3B82F6"}
            />
          </View>
          <Text className="font-JakartaBold text-xl text-gray-900 text-center mb-2">
            {title}
          </Text>
          <Text className="font-Jakarta text-gray-500 text-center mb-4">
            {message}
          </Text>
          <View className="flex-row w-full gap-3">
            {secondaryButtonText && onSecondaryPress && (
              <View className="flex-1">
                <CustomButton title={secondaryButtonText} onPress={onSecondaryPress} bgVariant="outline" textVariant="primary" />
              </View>
            )}
            <View className="flex-1">
              <CustomButton title={primaryButtonText} onPress={onClose} bgVariant={isDanger && (!secondaryButtonText) ? "danger" : "primary"} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomModal;
