// components/HomeScreen/SearchBar/index.tsx
// Thanh tìm kiếm phía trên màn hình Home (Zalo style)
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getAvatarUrl } from "@/lib/utils";
import { Image } from "react-native";

const ZaloSearchBar = () => {
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);

  const avatarUrl = getAvatarUrl(user?.name || "User", user?.avatar);

  return (
    <View style={styles.container}>
      {/* Left: avatar */}
      <TouchableOpacity
        onPress={() => router.push("/(root)/tabs/profile")}
        style={styles.avatarBtn}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      </TouchableOpacity>

      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBox}
        activeOpacity={0.85}
        onPress={() => router.push("/(root)/search")}
      >
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.8)" />
        <Text style={styles.placeholder}>Tìm kiếm</Text>
      </TouchableOpacity>

      {/* Right: actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.iconBtn}
          onPress={() => router.push("/(root)/create-group")}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0068FF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  placeholder: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "Jakarta-Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
});

export default ZaloSearchBar;
