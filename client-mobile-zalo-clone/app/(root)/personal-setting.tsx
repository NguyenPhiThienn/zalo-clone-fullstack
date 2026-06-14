import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';
import { formatFullName } from '@/lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const PersonalSettingScreen = () => {
  const { data: profile } = useProfile();
  const name = formatFullName(profile?.firstName, profile?.lastName || "");

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0068FF" />
      <SafeAreaView edges={['top']} style={styles.headerSafeArea} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{name}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SettingItem label="Thông tin" />
          <SettingItem label="Đổi ảnh đại diện" onPress={() => router.back()} />
          <SettingItem label="Đổi ảnh bìa" />
          <SettingItem label="Cập nhật giới thiệu bản thân" />
          <SettingItem label="Ví của tôi" hideDivider />
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          <SettingItem label="Mã QR của tôi" />
          <SettingItem label="Quyền riêng tư" />
          <SettingItem label="Quản lý tài khoản" />
          <SettingItem label="Cài đặt chung" hideDivider />
        </View>
      </ScrollView>
    </View>
  );
};

const SettingItem = ({ label, hideDivider, onPress }: { label: string, hideDivider?: boolean, onPress?: () => void }) => (
  <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
    <View style={styles.itemContent}>
      <Text style={styles.itemText}>{label}</Text>
    </View>
    {!hideDivider && <View style={styles.divider} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerSafeArea: { backgroundColor: '#0068FF' },
  header: {
    backgroundColor: '#0068FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 16, padding: 4 },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Jakarta-Medium',
  },
  content: { flex: 1 },
  section: {
    backgroundColor: 'white',
    paddingLeft: 16,
  },
  sectionTitle: {
    fontFamily: 'Jakarta-Medium',
    fontSize: 15,
    color: '#000',
    paddingVertical: 16,
    paddingRight: 16,
  },
  itemContainer: {
    backgroundColor: 'white',
  },
  itemContent: {
    paddingVertical: 16,
    paddingRight: 16,
  },
  itemText: {
    fontFamily: 'Jakarta',
    fontSize: 16,
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F3F4F6',
  }
});

export default PersonalSettingScreen;
