import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGroupMedia, GroupMediaDto } from '@/api/group';
import { getImageUrl, parseBackendDate } from '@/lib/utils';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 4) / COLUMN_COUNT;

type TabType = 'images' | 'videos' | 'files' | 'links';

const GroupStorageScreen = () => {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('images');
    const [media, setMedia] = useState<GroupMediaDto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadMedia();
        }
    }, [id]);

    const loadMedia = async () => {
        try {
            setLoading(true);
            const data = await getGroupMedia(id);
            setMedia(data);
        } catch (error) {
            console.error('Error loading media:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={28} color="#0068FF" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>Kho lưu trữ</Text>
                <Text style={styles.headerSubtitle}>{name || 'Nhóm'}</Text>
            </View>
            <TouchableOpacity onPress={loadMedia} style={styles.refreshBtn}>
                <Ionicons name="refresh-outline" size={22} color="#0068FF" />
            </TouchableOpacity>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {(['images', 'videos', 'files', 'links'] as TabType[]).map((tab) => {
                const isActive = activeTab === tab;
                const labels: Record<TabType, string> = {
                    images: 'Ảnh',
                    videos: 'Video',
                    files: 'File',
                    links: 'Link'
                };
                const icons: Record<TabType, keyof typeof Ionicons.prototype.props.name> = {
                    images: 'image-outline',
                    videos: 'film-outline',
                    files: 'document-text-outline',
                    links: 'link-outline'
                };

                return (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tab, isActive && styles.activeTab]}
                    >
                        <Ionicons
                            name={icons[tab] as any}
                            size={20}
                            color={isActive ? '#0068FF' : '#9CA3AF'}
                        />
                        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                            {labels[tab]}
                        </Text>
                        {media && (
                            <Text style={styles.tabCount}>
                                {tab === 'links' ? media.links.length : (media as any)[tab]?.length || 0}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#0068FF" />
                </View>
            );
        }

        const items = activeTab === 'links' ? media?.links : (media as any)?.[activeTab];
        if (!items || items.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyText}>Chưa có mục nào trong kho lưu trữ</Text>
                </View>
            );
        }

        if (activeTab === 'images') {
            return (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => Linking.openURL(getImageUrl(item.url) || item.url)}
                        >
                            <Image
                                source={{ uri: getImageUrl(item.url) || item.url }}
                                style={styles.imageItem}
                            />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            );
        }

        return (
            <FlatList
                data={items}
                keyExtractor={(item, index) => item.id || `link-${index}`}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => Linking.openURL(item.url)}
                    >
                        <View style={[styles.iconBox, activeTab === 'links' && styles.linkIconBox]}>
                            <Ionicons
                                name={activeTab === 'videos' ? 'play' : activeTab === 'files' ? 'document' : 'link'}
                                size={24}
                                color="white"
                            />
                        </View>
                        <View style={styles.listBody}>
                            <Text style={styles.listTitle} numberOfLines={1}>
                                {item.fileName || item.url}
                            </Text>
                            <Text style={styles.listMeta}>
                                {item.senderName} • {(() => {
                                    const parsed = parseBackendDate(item.createdDate);
                                    return parsed ? parsed.toLocaleDateString('vi-VN') : '';
                                })()}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {renderHeader()}
            {renderTabs()}
            <View style={styles.contentWrapper}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: { padding: 4 },
    headerInfo: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 18, fontFamily: 'Jakarta-Bold', color: '#111827' },
    headerSubtitle: { fontSize: 12, fontFamily: 'Jakarta-Medium', color: '#6B7280' },
    refreshBtn: { padding: 8 },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB'
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: { fontSize: 11, fontFamily: 'Jakarta-Medium', color: '#9CA3AF', marginTop: 4 },
    activeTabText: { color: '#0068FF', fontFamily: 'Jakarta-Bold' },
    tabCount: { fontSize: 9, color: '#D1D5DB', marginTop: 2 },
    contentWrapper: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 2 },
    imageWrapper: { padding: 1 },
    imageItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, backgroundColor: '#F3F4F6' },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F3F4F6',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    linkIconBox: { backgroundColor: '#0068FF' },
    listBody: { flex: 1 },
    listTitle: { fontSize: 14, fontFamily: 'Jakarta-Bold', color: '#374151' },
    listMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { marginTop: 16, color: '#9CA3AF', fontFamily: 'Jakarta-Medium' },
});

export default GroupStorageScreen;
