import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useProfile } from "@/hooks/useProfile";
import { uploadAvatar } from "@/api/user";
import { getAvatarUrl, formatFullName } from "@/lib/utils";

const { width } = Dimensions.get("window");

const PersonalWallScreen = () => {
  const { data: profile, refetch } = useProfile();
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const insets = useSafeAreaInsets();

  const name = formatFullName(profile?.firstName, profile?.lastName || "");
  const subtitle = profile?.email || "Trạng thái hiện tại";

  const processImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setUpdatingAvatar(true);
      try {
        const uri = result.assets[0].uri;
        const fileName = result.assets[0].fileName || uri.split("/").pop() || "avatar.jpg";
        let fileType = result.assets[0].mimeType || `image/${fileName.split(".").pop() || "jpeg"}`;

        if (fileType === 'image/jpg') fileType = 'image/jpeg';

        const formData = new FormData();
        // @ts-ignore
        formData.append("file", {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: fileName,
          type: fileType,
        });

        await uploadAvatar(formData);
        await refetch();
      } catch (err: any) {
        Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại.");
      } finally {
        setUpdatingAvatar(false);
      }
    }
  };

  const handlePickImage = () => {
    Alert.alert(
      "Đổi ảnh đại diện",
      "Bạn muốn làm gì?",
      [
        {
          text: "Chụp ảnh mới",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.granted === false) {
              Alert.alert("Lỗi quyền", "Bạn cần cấp quyền truy cập Camera để chụp ảnh.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            processImageResult(result);
          }
        },
        {
          text: "Chọn từ thư viện",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            processImageResult(result);
          }
        },
        { text: "Hủy", style: "cancel" }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* COVER & HEADER */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=1000" }} // Placeholder cover (sunset clouds)
            style={styles.coverImage}
          />
          <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="time-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(root)/personal-setting')} style={styles.iconBtn}>
                <Ionicons name="ellipsis-horizontal" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* AVATAR OVERLAY */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
              <Image
                source={{
                  uri: getAvatarUrl(name, profile?.avatarUrl)
                }}
                style={styles.avatar}
              />
              {updatingAvatar && (
                <View style={styles.avatarLoading}>
                  <Ionicons name="sync" size={24} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{name}</Text>
        </View>

        {/* 3 ACTION BUTTONS */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="color-palette" size={22} color="#0068FF" />
            <Text style={styles.actionCardText}>Cài zStyle</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="image" size={22} color="#0068FF" />
            <Text style={styles.actionCardText}>Ảnh của tôi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="archive" size={22} color="#0068FF" />
            <Text style={styles.actionCardText}>Kho khoảnh khắc</Text>
          </TouchableOpacity>
        </View>

        {/* NEW FEED / DIARY SECTION */}
        <View style={styles.diarySection}>
          <View style={styles.illustrationWrapper}>
            <View style={styles.phoneMockup}>
              <View style={styles.mockupHeader} />
              <View style={styles.mockupLine} />
              <View style={styles.mockupLine} />
              <View style={styles.mockupLine} />
            </View>
            <View style={styles.heartBadge}>
              <Ionicons name="heart" size={14} color="#EF4444" />
            </View>
            <View style={styles.chatBadge}>
              <Ionicons name="chatbubble-ellipses" size={14} color="#10B981" />
            </View>
          </View>

          <Text style={styles.diaryPrompt}>Hôm nay {name} có gì vui?</Text>
          <Text style={styles.diarySubtext}>
            Đây là Nhật ký của bạn - Hãy làm đầy Nhật ký{'\n'}
            với những dấu ấn cuộc đời và kỷ niệm đáng{'\n'}nhớ nhé!
          </Text>
          <TouchableOpacity style={styles.postButton}>
            <Text style={styles.postButtonText}>Đăng lên Nhật ký</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView >
    </View >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F5F8" },
  scrollContent: { paddingBottom: 40 },
  coverContainer: {
    position: "relative",
    marginBottom: 70, // Create space for avatar overflow
  },
  coverImage: {
    width: "100%",
    height: 320, // Taller cover logic resembling image
    backgroundColor: "#E5E7EB",
  },
  headerOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: { padding: 8, marginLeft: 8 },
  avatarWrapper: {
    position: "absolute",
    bottom: -60,
    alignSelf: "center",
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#F3F4F6",
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBubble: {
    position: "absolute",
    right: -20,
    top: -10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBubbleText: {
    fontFamily: "Jakarta-Medium",
    fontSize: 12,
    color: "#1F2937",
    textAlign: "center",
  },
  statusBubbleTail: {
    position: "absolute",
    right: 15,
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  infoContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  nameText: {
    fontFamily: "Jakarta-Bold",
    fontSize: 22,
    color: "#000",
    marginBottom: 4,
  },
  subtitleText: {
    fontFamily: "Jakarta",
    fontSize: 15,
    color: "#6B7280",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1, // To equal distribution
  },
  actionCardText: {
    fontFamily: "Jakarta-Medium",
    fontSize: 12,
    color: "#1F2937",
    marginLeft: 6,
  },
  diarySection: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  illustrationWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E5F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  phoneMockup: {
    width: 50,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#BFDBFE",
    padding: 6,
    alignItems: "center",
  },
  mockupHeader: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#E0E7FF", marginBottom: 8 },
  mockupLine: { width: 30, height: 4, backgroundColor: "#E0E7FF", borderRadius: 2, marginBottom: 4, alignSelf: "flex-start" },
  heartBadge: {
    position: "absolute",
    left: 20,
    bottom: 40,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  chatBadge: {
    position: "absolute",
    right: 25,
    top: 30,
    backgroundColor: "white",
    padding: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  diaryPrompt: {
    fontFamily: "Jakarta-Bold",
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
  },
  diarySubtext: {
    fontFamily: "Jakarta-Medium",
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  postButton: {
    backgroundColor: "#0068FF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  postButtonText: {
    fontFamily: "Jakarta-Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default PersonalWallScreen;
