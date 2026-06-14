// app/(auth)/welcome.tsx — Chào mừng người dùng Zalo Clone
import React, { useRef, useState } from "react";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import SwiperFlatList from "react-native-swiper-flatlist";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import CustomButton from "@/components/Common/CustomButton";
import { onboarding } from "@/constants";

const { width: screenWidth } = Dimensions.get("window");

const Onboarding = () => {
  const { t } = useTranslation();
  const swiperRef = useRef<SwiperFlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === onboarding.length - 1;

  return (
    <View className="flex-1 bg-white">
      {/* Header màu xanh chuẩn Zalo Clone để hiện Giờ, Pin, Sóng */}
      <View className="bg-primary-500">
        <StatusBar style="light" />
        <SafeAreaView edges={["top"]} />
      </View>

      <View className="flex-1 justify-between items-center">
        <View className="flex justify-end items-end p-4 w-full">
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/sign-in")}
            className="bg-gray-100 px-4 py-1.5 rounded-full"
          >
            <Text className="text-gray-600 text-sm font-JakartaBold">
              Bỏ qua
            </Text>
          </TouchableOpacity>
        </View>

        <SwiperFlatList
          ref={swiperRef}
          autoplay={false}
          index={activeIndex}
          showPagination={true}
          paginationStyle={{
            position: "absolute",
            bottom: 150,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
          paginationStyleItem={{
            width: 32,
            height: 4,
            marginHorizontal: 4,
            borderRadius: 2,
          }}
          paginationStyleItemActive={{ backgroundColor: "#0068FF" }}
          paginationStyleItemInactive={{ backgroundColor: "#E2E8F0" }}
          onChangeIndex={({ index }) => setActiveIndex(index)}
          data={onboarding}
          renderItem={({ item }) => (
            <View key={item.id} className="flex justify-center items-center p-4" style={{ width: screenWidth }}>
              <Image source={item.image} style={{ width: screenWidth * 0.8, height: 280 }} resizeMode="contain" />
              <View className="mt-10 mx-6">
                <Text className="text-2xl font-JakartaBold text-center text-black">{item.title}</Text>
                <Text className="text-lg font-JakartaMedium text-center text-gray-500 mt-4 leading-6">Bắt đầu hành trình cùng Zalo Clone ngay hôm nay.</Text>
              </View>
            </View>
          )}
        />
        <View className="px-6 pb-12 w-full">
          <CustomButton
            title={isLastSlide ? t("common.done") : t("common.next")}
            onPress={() =>
              isLastSlide
                ? router.replace("/(auth)/sign-in")
                : swiperRef.current?.scrollToIndex({ index: activeIndex + 1 })
            }
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
};

export default Onboarding;
