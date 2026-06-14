/* eslint-disable */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import { Audio, Video, ResizeMode } from 'expo-av';
import ForwardModal from '../ForwardModal';
import ReportModal from '@/components/ReportModal';
import { ChatMessage } from '@/types/type';
import { getImageUrl, getAvatarUrl } from '@/lib/utils';
import ImageViewing from "react-native-image-viewing";
import { useRecallMessage, useDeleteMessage } from '@/hooks/useMessages';
import { useReactToMessage, useReactToGroupMessage } from '@/hooks/useReaction';
import { useRecallGroupMessage, useDeleteGroupMessage, usePinGroupMessage } from '@/hooks/useGroup';

const emojis = ['❤️', '👍', '😆', '😲', '😢', '😡'];

const MessageItem = ({ item, isMe, isGroup, onReply, onScrollToMessage, isHighlighted }: { item: ChatMessage; isMe: boolean; isGroup: boolean; onReply?: (msg: ChatMessage) => void; onScrollToMessage?: (msgId: string) => void; isHighlighted?: boolean }) => {
  const isDeleted = item.deleted === true || item.text === 'Tin nhắn đã bị xóa' || (item.text || '').includes('thu hồi') || (item.content || '').includes('thu hồi');
  const chatId = item.chatId || "";

  const { mutate: recallPrivate } = useRecallMessage(chatId);
  const { mutate: deletePrivate } = useDeleteMessage(chatId);
  const { mutate: recallGroup } = useRecallGroupMessage(chatId);
  const { mutate: deleteGroup } = useDeleteGroupMessage(chatId);
  const { mutate: reactPrivate } = useReactToMessage(chatId);
  const { mutate: reactGroup } = useReactToGroupMessage(chatId);
  const { mutate: pin } = usePinGroupMessage(chatId);

  const react = isGroup ? reactGroup : reactPrivate;
  const doRecall = isGroup ? recallGroup : recallPrivate;
  const doDelete = isGroup ? deleteGroup : deletePrivate;

  // Kiểm tra 10 phút để thu hồi
  const handleRecallAction = () => {
    setShowMenu(false);
    if (item.createdAt) {
      const diffMs = Date.now() - new Date(item.createdAt).getTime();
      if (diffMs > 10 * 60 * 1000) {
        Alert.alert("Hết hạn", "Bạn chỉ có thể thu hồi tin nhắn trong vòng 10 phút sau khi gửi.");
        return;
      }
    }
    doRecall(item.id);
  };

  const highlightAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [isHighlighted, highlightAnim]);

  const highlightBackgroundColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,104,255,0)', 'rgba(0,104,255,0.2)']
  });


  const handleReplyAction = () => {
    setShowMenu(false);
    if (onReply) onReply(item);
  };

  const [showMenu, setShowMenu] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const handlePlayAudio = async () => {
    const mUrl = getImageUrl(item.image || item.mediaUrl);
    if (!mUrl) return;

    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          setSound(null); // Force reload if instance unmounted or corrupted
        } else {
          if (isAudioPlaying) {
            await sound.pauseAsync();
            setIsAudioPlaying(false);
          } else {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
              staysActiveInBackground: false,
            });
            if (status.didJustFinish || status.positionMillis === status.durationMillis) {
              await sound.replayAsync();
            } else {
              await sound.playAsync();
            }
            setIsAudioPlaying(true);
          }
          return;
        }
      } catch (e) {
        setSound(null);
      }
    }

    try {
      setAudioLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: mUrl }, { shouldPlay: true });
      setSound(newSound);
      setIsAudioPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsAudioPlaying(false);
          newSound.setPositionAsync(0);
        }
      });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể phát âm thanh");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleDownload = async () => {
    setShowMenu(false);
    const mUrl = getImageUrl(item.image || item.mediaUrl);
    if (!mUrl) return;

    if (item.type === 'IMAGE' || item.type === 'VIDEO') {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Lỗi", "Cần quyền");
        const dir = cacheDirectory;
        if (!dir) return Alert.alert("Lỗi", "Không tìm thấy bộ nhớ tạm");

        const fileName = (item.image || item.mediaUrl || 'm').split('/').pop() || 'media';
        const downloadPath = dir + (dir.endsWith('/') ? '' : '/') + fileName;
        const downloadResult = await downloadAsync(mUrl, downloadPath);
        if (downloadResult.status === 200) {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync("Zalo Clone", asset, false);
          Alert.alert("Thành công", "Đã lưu");
        }
      } catch (e) { Alert.alert("Lỗi", "Không thể lưu"); }
    } else { WebBrowser.openBrowserAsync(mUrl); }
  };

  const handleCopy = async () => {
    setShowMenu(false);
    const contentToCopy = item.text || item.content || "";
    if (contentToCopy) {
      await Clipboard.setStringAsync(contentToCopy);
      Alert.alert("Thành công", "Đã sao chép nội dung");
    }
  };

  const getFileIconMobile = (filename: string) => {
    if (!filename) return { letter: '?', color: '#6B7280', bg: '#F3F4F6' };
    const ext = filename.split('.').pop()?.toLowerCase() || "";

    const map: any = {
      pdf: { letter: 'PDF', color: '#FFFFFF', bg: '#EF4444' },
      doc: { letter: 'W', color: '#FFFFFF', bg: '#2563EB' },
      docx: { letter: 'W', color: '#FFFFFF', bg: '#2563EB' },
      xls: { letter: 'X', color: '#FFFFFF', bg: '#16A34A' },
      xlsx: { letter: 'X', color: '#FFFFFF', bg: '#16A34A' },
      csv: { letter: 'X', color: '#FFFFFF', bg: '#16A34A' },
      ppt: { letter: 'P', color: '#FFFFFF', bg: '#EA580C' },
      pptx: { letter: 'P', color: '#FFFFFF', bg: '#EA580C' },
      zip: { letter: 'ZIP', color: '#FFFFFF', bg: '#D97706' },
      rar: { letter: 'RAR', color: '#FFFFFF', bg: '#D97706' },
      '7z': { letter: '7Z', color: '#FFFFFF', bg: '#D97706' },
      js: { letter: 'JS', color: '#000000', bg: '#FBBF24' },
      txt: { letter: 'TXT', color: '#FFFFFF', bg: '#9CA3AF' },
    };

    return map[ext] || { letter: ext.toUpperCase() || '?', color: '#FFFFFF', bg: '#3B82F6' };
  };

  const renderContent = () => {
    if (isDeleted) return <Text style={[styles.messageText, styles.deletedText]}>Tin nhắn đã được thu hồi</Text>;

    const mUrl = getImageUrl(item.image || item.mediaUrl);
    const fileName = (item.text || item.content || '').toLowerCase();
    const isVideo = item.type === 'VIDEO' || fileName.endsWith('.mp4');
    const isAudio = item.type === 'AUDIO' || item.type === 'VOICE' || fileName.endsWith('.m4a');
    const isImage = item.type === 'IMAGE' || fileName.endsWith('.jpg') || fileName.endsWith('.png');

    if (isImage && mUrl) {
      return (
        <TouchableOpacity style={styles.mediaContainer} onPress={() => setIsImageViewVisible(true)} activeOpacity={0.8}>
          <Image source={{ uri: mUrl }} style={styles.imageBox} resizeMode="cover" />
          {item.state === 'SENDING' && <View style={styles.mediaOverlay}><ActivityIndicator color="white" /></View>}
        </TouchableOpacity>
      );
    }

    if (isVideo && mUrl) {
      if (isPlayingMedia) {
        return (
          <View style={styles.videoActive}>
            <Video
              source={{ uri: mUrl }}
              style={{ flex: 1, borderRadius: 8 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay
            />
            <TouchableOpacity style={styles.closeVideo} onPress={() => setIsPlayingMedia(false)}><Ionicons name="close" size={16} color="white" /></TouchableOpacity>
          </View>
        );
      }
      return (
        <TouchableOpacity style={styles.videoPlaceholder} onPress={() => setIsPlayingMedia(true)}>
          <Ionicons name="play-circle" size={48} color="white" /><Text style={styles.videoTag}>VIDEO</Text>
        </TouchableOpacity>
      );
    }

    if (isAudio && mUrl) {
      return (
        <TouchableOpacity style={styles.audioRow} onPress={handlePlayAudio} disabled={item.state === 'SENDING'}>
          <View style={styles.audioIconBox}>
            {audioLoading ? <ActivityIndicator size="small" color="#0068FF" /> : <Ionicons name={isAudioPlaying ? "pause" : "play"} size={22} color="#0068FF" />}
          </View>
          <View style={styles.audioMeta}>
            <Text style={styles.audioLabel}>Tin nhắn thoại</Text>
            <View style={styles.audioTrack}><View style={[styles.audioProgress, { width: isAudioPlaying ? '100%' : '0%' }]} /></View>
          </View>
        </TouchableOpacity>
      );
    }

    const mType = (item.type || 'TEXT').toUpperCase();
    const isImg = mType === 'IMAGE';
    const isVid = mType === 'VIDEO';
    const fileExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.txt', '.mp3', '.mp4', '.m4a'];
    const hasFileExt = (str?: string) => str && fileExts.some(ext => str.toLowerCase().endsWith(ext) || str.toLowerCase().includes(ext + '?'));

    if ((mType === 'FILE' || mType === 'AUDIO' || hasFileExt(item.mediaUrl) || hasFileExt(item.content) || (mUrl && !isImg && !isVid)) && mUrl) {
      // Tìm tên file "sạch": ưu tiên fileName, sau đó là content/text nếu có dấu chấm, cuối cùng là URL
      const urlPart = mUrl.split('/').pop()?.split('?')[0] || '';
      let displayFile = item.fileName || '';

      if (!displayFile && item.content && item.content.includes('.') && !item.content.startsWith('http')) {
        displayFile = item.content;
      }

      if (!displayFile && item.text && item.text.includes('.') && !item.text.startsWith('http')) {
        displayFile = item.text;
      }

      if (!displayFile) {
        displayFile = urlPart || 'Tài liệu';
      }

      const fileInfo = getFileIconMobile(displayFile);

      return (
        <View style={[styles.fileCard, isMe ? styles.fileCardMine : styles.fileCardTheirs]}>
          <View style={[styles.fileLetterBox, { backgroundColor: fileInfo.bg }]}>
            <Text style={[styles.fileLetter, { color: fileInfo.color }]}>{fileInfo.letter}</Text>
          </View>

          <View style={styles.fileMainInfo}>
            <Text style={[styles.fileTitle, isMe ? { color: '#FFF' } : { color: '#000' }]} numberOfLines={1}>{displayFile}</Text>
          </View>

          <View style={styles.fileActions}>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(mUrl)} style={styles.fileBtn}>
              <Ionicons name="folder-open-outline" size={18} color={isMe ? "#E2E8F0" : "#64748B"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(mUrl)} style={styles.fileBtn}>
              <Ionicons name="download-outline" size={18} color={isMe ? "#E2E8F0" : "#64748B"} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.text || item.content}</Text>;
  };

  if (item.type === 'NOTIFICATION' || item.type === 'SYSTEM' as any) {
    return (
      <View style={styles.systemMessageContainer}>
        <View style={styles.systemMessagePill}>
          <Text style={styles.systemMessageText}>{item.content || item.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
      {!isMe && (
        <View style={styles.avatarSpace}>
          <Image source={{ uri: item.avatar || getAvatarUrl(item.senderName || "User", undefined) }} style={styles.avatar} />
        </View>
      )}

      <View style={[styles.contentArea, isMe ? styles.myContent : styles.otherContent]}>
        {isGroup && !isMe && item.senderName && (<Text style={styles.senderNameText}>{item.senderName}</Text>)}

        <TouchableOpacity onLongPress={() => !isDeleted && setShowMenu(true)} activeOpacity={0.9}>
          <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble, isDeleted && styles.deletedBubble]}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: highlightBackgroundColor, borderRadius: 16 }]} pointerEvents="none" />
            {item.replyTo && !isDeleted && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onScrollToMessage && item.replyTo?.id && onScrollToMessage(item.replyTo.id)}
              >
                <View style={[styles.replyBlock, isMe ? styles.replyBlockMe : styles.replyBlockOther, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.replyName, { color: '#0068FF' }]} numberOfLines={1}>
                      {item.replyTo.senderName || 'Tin nhắn'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {!item.replyTo.content && <Ionicons name="document-outline" size={12} color={isMe ? '#4B5563' : '#6B7280'} style={{ marginRight: 4 }} />}
                      <Text style={[styles.replyContent, isMe ? { color: '#4B5563' } : { color: '#6B7280' }]} numberOfLines={1}>
                        {item.replyTo.content || 'Tệp'}
                      </Text>
                    </View>
                  </View>
                  {item.replyTo.mediaUrl && (item.replyTo.type === 'IMAGE' || item.replyTo.type === 'VIDEO') && (
                    <Image
                      source={{ uri: getImageUrl(item.replyTo.mediaUrl) }}
                      style={{ width: 36, height: 36, borderRadius: 4, marginLeft: 8 }}
                      resizeMode="cover"
                    />
                  )}
                </View>
              </TouchableOpacity>
            )}
            {renderContent()}
            {!isDeleted && (
              <View style={styles.footer}>
                <>
                  <View style={styles.timeLine}>
                    <Text style={[styles.timeText, isMe ? styles.myTime : styles.otherTime]}>{item.time}</Text>
                  </View>
                  <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => react({ messageId: item.id, emoji: '❤️' })}>
                    {item.reactions && item.reactions.length > 0 ? (
                      <Text style={{ fontSize: 12 }}>{item.reactions[item.reactions.length - 1].emoji}</Text>
                    ) : (<Ionicons name="heart-outline" size={16} color={isMe ? "#0068FF" : "#8E8E93"} />)}
                  </TouchableOpacity>
                </>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Trạng thái tin nhắn — hiển thị trên tất cả tin nhắn của mình (giống web) */}
        {isMe && !isDeleted && item.state && (
          <View style={styles.statusRow}>
            {item.state === 'SENDING' && (
              <Text style={styles.statusSending}>Đang gửi...</Text>
            )}
            {item.state === 'SENT' && (
              <Text style={styles.statusLabel}>Đã gửi</Text>
            )}
            {item.state === 'DELIVERED' && (
              <Text style={styles.statusLabel}>Đã nhận</Text>
            )}
            {item.state === 'SEEN' && (
              <Text style={styles.statusLabelSeen}>Đã xem</Text>
            )}
          </View>
        )}

        {item.reactions && item.reactions.length > 0 && (
          <View style={styles.reactionBadge}>
            {item.reactions.slice(0, 3).map((r, i) => <Text key={i} style={{ fontSize: 10 }}>{r.emoji}</Text>)}
          </View>
        )}
      </View>

      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuBox}>
              <Text style={styles.menuTitle}>Tùy chọn</Text>
              <View style={styles.emojiRow}>
                {emojis.map(e => (
                  <TouchableOpacity key={e} onPress={() => { react({ messageId: item.id, emoji: e }); setShowMenu(false); }}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ gap: 4 }}>
                {item.type === 'TEXT' && <MenuAction icon="copy-outline" label="Sao chép" color="#0068FF" onPress={handleCopy} />}
                <MenuAction icon="arrow-undo-outline" label="Trả lời" color="#0068FF" onPress={handleReplyAction} />
                <MenuAction icon="arrow-redo-outline" label="Chuyển tiếp" onPress={() => { setShowMenu(false); setShowForward(true); }} />
                {item.type !== 'TEXT' && <MenuAction icon="download-outline" label="Tải về" color="#0068FF" onPress={handleDownload} />}
                {isGroup && <MenuAction icon="pin-outline" label="Ghim tin nhắn" color="#0068FF" onPress={() => { setShowMenu(false); pin(item.id); }} />}
                {isMe && <MenuAction icon="refresh-outline" label="Thu hồi" color="#EF4444" onPress={handleRecallAction} />}
                <MenuAction icon="trash-outline" label="Xóa phía mình" color="#EF4444" onPress={() => { setShowMenu(false); doDelete(item.id); }} />
                <MenuAction icon="warning-outline" label="Tố cáo" color="#F59E0B" onPress={() => { setShowMenu(false); setShowReport(true); }} />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ForwardModal visible={showForward} onClose={() => setShowForward(false)} messageContent={item.text || item.content || ""} messageType={item.type} mediaUrl={item.image || item.mediaUrl} />
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} targetId={item.id} type="MESSAGE" />
      <ImageViewing
        images={[{ uri: getImageUrl(item.image || item.mediaUrl) || '' }]}
        imageIndex={0}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        swipeToCloseEnabled={true}
      />
    </View>
  );
};

const MenuAction = ({ icon, label, color = "#1F2937", onPress }: { icon: any; label: string; color?: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.menuItem}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={[styles.menuItemText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 12 },
  myContainer: { justifyContent: 'flex-end' },
  otherContainer: { justifyContent: 'flex-start' },
  avatarSpace: { marginRight: 8, alignSelf: 'flex-end', paddingBottom: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  contentArea: { maxWidth: '80%' },
  myContent: { alignItems: 'flex-end' },
  otherContent: { alignItems: 'flex-start' },
  senderNameText: { fontSize: 11, color: '#0068FF', fontWeight: 'bold', marginBottom: 4, marginLeft: 4 },
  bubble: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 18, borderWidth: 0.5, minWidth: 80 },
  myBubble: { backgroundColor: '#EAF6FF', borderColor: '#D5E9F7', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#FFFFFF', borderColor: '#E1E6E9', borderBottomLeftRadius: 4 },
  deletedBubble: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  messageText: { fontSize: 16, lineHeight: 22, color: '#1F2937' },
  myText: { color: '#1F2937' },
  otherText: { color: '#1F2937' },
  deletedText: { color: '#9CA3AF', fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  timeLine: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 10, color: '#6B7280' },
  myTime: { color: '#6B7280' },
  otherTime: { color: '#94A3B8' },
  statusRow: { marginTop: 2, marginRight: 4, alignItems: 'flex-end' },
  statusSending: { fontSize: 10, color: '#94A3B8', fontStyle: 'italic', fontFamily: 'Jakarta-Medium' },
  statusLabel: { fontSize: 10, color: '#94A3B8', fontFamily: 'Jakarta-Medium' },
  statusLabelSeen: { fontSize: 10, color: '#0068FF', fontFamily: 'Jakarta-Bold' },
  mediaContainer: { marginBottom: 4, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  imageBox: { width: 224, height: 288 },
  mediaOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  videoActive: { width: 256, height: 192, borderRadius: 12, overflow: 'hidden', backgroundColor: 'black' },
  closeVideo: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 12 },
  videoPlaceholder: { width: 224, height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  videoTag: { color: 'white', fontWeight: 'bold', fontSize: 10, marginTop: 4 },
  audioRow: { flexDirection: 'row', alignItems: 'center', padding: 12, minWidth: 180, backgroundColor: 'rgba(0, 104, 255, 0.05)', borderRadius: 16 },
  audioIconBox: { backgroundColor: '#DBEAFE', padding: 8, borderRadius: 20 },
  audioMeta: { marginLeft: 12, flex: 1 },
  audioLabel: { color: '#1F2937', fontWeight: 'bold', fontSize: 14 },
  audioTrack: { height: 4, backgroundColor: '#BFDBFE', width: '100%', marginTop: 6, borderRadius: 2 },
  audioProgress: { height: '100%', backgroundColor: '#0068FF' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    minWidth: 260,
    borderWidth: 1,
  },
  fileCardMine: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fileCardTheirs: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  fileLetterBox: {
    width: 44,
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  fileLetter: {
    fontSize: 14,
    fontWeight: '900',
  },
  fileMainInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fileSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSizeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginRight: 8,
  },
  fileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  fileStatusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  fileActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  fileBtn: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 4,
  },
  reactionBadge: { flexDirection: 'row', marginTop: -6, backgroundColor: 'white', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  replyBlock: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  replyBlockMe: { borderLeftColor: '#0068FF', backgroundColor: 'rgba(0,104,255,0.08)' },
  replyBlockOther: { borderLeftColor: '#0068FF', backgroundColor: '#EFF6FF' },
  replyName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  replyContent: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  menuBox: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 },
  menuTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1F2937' },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  menuItemText: { marginLeft: 16, fontSize: 16, fontWeight: '500' },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  systemMessagePill: {
    backgroundColor: '#F1F2F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: '80%',
  },
  systemMessageText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Jakarta-Medium',
    textAlign: 'center',
  },
});

export default MessageItem;
