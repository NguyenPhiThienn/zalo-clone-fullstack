import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Info, LogOut, ChevronLeft, UserPlus, Pencil, Camera, Pin, MoreHorizontal, Smile, Copy, RotateCcw, Trash2, Share2, FolderOpen, Phone, Video as VideoIcon } from 'lucide-react';
import {
  getGroupDetail, getGroupMessages, sendGroupMessage, uploadGroupMedia,
  leaveGroup, addGroupMembers, removeGroupMember, updateGroup, uploadGroupAvatar,
  recallGroupMessage, setMemberAsAdmin, dissolveGroup,
  toggleGroupReaction, deleteGroupReaction,
  pinGroupMessage, unpinGroupMessage,
  deleteGroupMessageForMe, sendGroupMessage as sendMsg,
  createGroupJoinRequest, getGroupJoinRequests, approveGroupJoinRequest, rejectGroupJoinRequest,
} from '../../api/group';
import { sendMessage } from '../../api/message';
import { startChat } from '../../api/chat';
import { getContacts } from '../../api/friendRequest';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import wsService from '../../services/websocket';
import Avatar from '../common/Avatar';
import MessageInput from '../chat/MessageInput';
import TypingIndicator from '../chat/TypingIndicator';
import Modal from '../common/Modal';
import SummaryBanner from './SummaryBanner';
import SmartReplySuggestions from './SmartReplySuggestions';
import GroupMediaPanel from './GroupMediaPanel';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';

// ID cố định của AI Bot user (phải khớp với GroupAiService.AI_BOT_USER_ID và V21 migration)
const AI_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

// ─── GroupMessageBubble ───────────────────────────────────────────────────────

function GroupMessageBubble({ message, groupId, isAdmin }) {
  const { auth } = useAuthStore();
  const { updateGroupMessage, updateGroupMessageReactions, setPinnedMessages } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const isMine = message.senderId === auth?.userId;
  const isBot = message.senderId?.toString() === AI_BOT_USER_ID;
  const BASE_URL = import.meta.env.VITE_API_URL || '';

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-1 px-4">
        <span className="text-xs text-gray-400 bg-gray-100/80 rounded-full px-3 py-1 select-none">
          {message.content}
        </span>
      </div>
    );
  }

  // ─── AI Bot bubble ──────────────────────────────────────────────────────────
  if (isBot) {
    return (
      <div className="flex items-start gap-2 px-4 py-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0 shadow-sm">
          🤖
        </div>
        <div className="max-w-[65%]">
          <span className="text-xs font-semibold text-violet-600 mb-1 block">Trợ lý AI</span>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <span className="text-sm whitespace-pre-wrap break-words text-gray-800">{message.content}</span>
            <div className="text-[10px] text-violet-400 text-right mt-1">
              {message.createdDate ? format(new Date(message.createdDate), 'HH:mm', { locale: vi }) : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.hiddenForMe) return null;

  const getMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const downloadFile = async (mediaUrl, filename) => {
    try {
      const rawName = mediaUrl.split('/').pop()?.split('?')[0] || filename || 'download';
      const downloadUrl = `${BASE_URL}/api/v1/message/media/${rawName}?download=true`;
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      const res = await fetch(downloadUrl, {
        headers: auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      });
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || rawName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(mediaUrl, '_blank');
    }
  };

  const handleRecall = async () => {
    setShowMenu(false);
    try {
      await recallGroupMessage(groupId, message.id);
      updateGroupMessage(groupId, message.id, { deleted: true, content: '' });
    } catch {
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    try {
      await deleteGroupMessageForMe(groupId, message.id);
      updateGroupMessage(groupId, message.id, { hiddenForMe: true });
    } catch {
    }
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
    setShowMenu(false);
  };

  const handlePin = async () => {
    setShowMenu(false);
    try {
      const res = await pinGroupMessage(groupId, message.id);
      setPinnedMessages(groupId, res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể ghim tin nhắn');
    }
  };

  const handleUnpin = async () => {
    setShowMenu(false);
    try {
      const res = await unpinGroupMessage(groupId, message.id);
      setPinnedMessages(groupId, res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể bỏ ghim tin nhắn');
    }
  };

  const handleReaction = async (emojiData) => {
    setShowEmoji(false);
    setShowActions(false);
    try {
      const res = await toggleGroupReaction(message.id, emojiData.emoji);
      if (Array.isArray(res.data)) {
        updateGroupMessageReactions(groupId, message.id, res.data);
      }
    } catch {}
  };

  const handleRemoveReaction = async () => {
    try {
      await deleteGroupReaction(message.id);
      const existing = (message.reactions || []).filter((r) => r.userId !== auth?.userId);
      updateGroupMessageReactions(groupId, message.id, existing);
    } catch {}
  };

  const myReaction = (message.reactions || []).find((r) => r.userId === auth?.userId);
  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const renderContent = () => {
    if (message.deleted) {
      return <span className="italic text-gray-400 text-sm">Tin nhắn đã được thu hồi</span>;
    }
    const type = message.type || 'TEXT';
    const mediaUrl = getMediaUrl(message.mediaUrl);

    if (type === 'IMAGE' && mediaUrl) {
      return (
        <div className="relative group/img">
          <img src={mediaUrl} alt="img" onClick={() => setImagePreview(mediaUrl)}
            className="rounded-xl cursor-pointer max-w-[240px] max-h-[240px] object-cover" />
          <button onClick={() => downloadFile(mediaUrl, message.fileName)}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity" title="Tải xuống">⬇</button>
        </div>
      );
    }
    if (type === 'VIDEO' && mediaUrl) {
      return (
        <div className="relative group/vid">
          <video src={mediaUrl} controls className="rounded-xl max-w-[240px] max-h-[240px]" />
          <button onClick={() => downloadFile(mediaUrl, message.fileName)}
            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover/vid:opacity-100 transition-opacity" title="Tải xuống">⬇</button>
        </div>
      );
    }
    if ((type === 'FILE' || type === 'AUDIO') && mediaUrl) {
      const displayName = message.fileName || mediaUrl.split('/').pop()?.split('?')[0] || 'Tệp đính kèm';
      return (
        <div className="flex items-center gap-2">
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm underline min-w-0" title="Mở file">
            📎 <span className="truncate max-w-[180px]">{displayName}</span>
          </a>
          <button onClick={(e) => { e.stopPropagation(); downloadFile(mediaUrl, displayName); }}
            className="flex-shrink-0 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors" title="Tải xuống">⬇</button>
        </div>
      );
    }
    return <span className="text-sm whitespace-pre-wrap break-words">{message.content}</span>;
  };

  return (
    <>
      <div
        id={`msg-${message.id}`}
        className={`flex items-end gap-2 px-4 py-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { if (!showEmoji && !showMenu) setShowActions(false); }}
      >
        <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[65%]`}>
          {!isMine && message.senderName && (
            <span className="text-xs text-blue-600 font-medium mb-1 ml-1">{message.senderName}</span>
          )}
          <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
            message.deleted ? 'bg-gray-100 text-gray-400'
              : isMine ? 'bg-[#0068ff] text-white rounded-br-sm'
              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
          }`}>
            {renderContent()}
            <div className={`text-[10px] mt-1 ${isMine ? 'text-blue-100 text-right' : 'text-gray-400 text-right'}`}>
              {message.createdDate ? format(new Date(message.createdDate), 'HH:mm', { locale: vi }) : ''}
            </div>
          </div>
          {Object.keys(groupedReactions).length > 0 && (
            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button key={emoji} onClick={myReaction?.emoji === emoji ? handleRemoveReaction : undefined}
                  className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-gray-50">
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-gray-600">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {!message.deleted && showActions && (
          <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            {/* Emoji reaction */}
            <div className="relative">
              <button onClick={() => { setShowEmoji(!showEmoji); setShowMenu(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100">
                <Smile size={14} className="text-gray-500" />
              </button>
              {showEmoji && (
                <div className={`absolute bottom-8 z-30 ${isMine ? 'right-0' : 'left-0'}`} onClick={(e) => e.stopPropagation()}>
                  <EmojiPicker onEmojiClick={handleReaction} width={300} height={350} searchPlaceHolder="Tìm emoji..." />
                </div>
              )}
            </div>
            {/* More actions menu */}
            <div className="relative">
              <button onClick={() => { setShowMenu(!showMenu); setShowEmoji(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100" title="Tùy chọn">
                <MoreHorizontal size={14} className="text-gray-500" />
              </button>
              {showMenu && (
                <div className={`absolute bottom-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 ${isMine ? 'right-0' : 'left-0'}`}>
                  {message.content && (
                    <button onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50">
                      <Copy size={14} /> Sao chép
                    </button>
                  )}
                  <button onClick={() => { setShowForward(true); setShowMenu(false); }}
                    className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50">
                    <Share2 size={14} /> Chuyển tiếp
                  </button>
                  {!message.pinned && (
                    <button onClick={handlePin}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50">
                      <Pin size={14} /> Ghim tin nhắn
                    </button>
                  )}
                  {message.pinned && (
                    <button onClick={handleUnpin}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50">
                      <Pin size={14} /> Bỏ ghim
                    </button>
                  )}
                  {(isMine || isAdmin) && (
                    <button onClick={handleRecall}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50">
                      <RotateCcw size={14} /> Thu hồi
                    </button>
                  )}
                  {isMine && (
                    <button onClick={handleDelete}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
                      <Trash2 size={14} /> Xóa
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {imagePreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}

      {showForward && (
        <ForwardGroupModal message={message} onClose={() => setShowForward(false)} currentGroupId={groupId} />
      )}
    </>
  );
}

// ─── ForwardGroupModal (inline) ──────────────────────────────────────────────

function ForwardGroupModal({ message, onClose, currentGroupId }) {
  const { chats, groups } = useChatStore();
  const [selected, setSelected] = useState(null); // { type: 'chat'|'group', id }
  const [loading, setLoading] = useState(false);

  const handleForward = async () => {
    if (!selected) {; return; }
    setLoading(true);
    try {
      if (selected.type === 'chat') {
        await sendMessage({ content: message.content || '', chatId: selected.id, type: message.type || 'TEXT' });
      } else {
        await sendMsg(selected.id, { content: message.content || '', type: message.type || 'TEXT' });
      }
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Chuyển tiếp tin nhắn</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {chats.length > 0 && <p className="text-xs text-gray-400 font-medium px-1 mb-1">Tin nhắn</p>}
          {chats.map((chat) => (
            <button key={chat.id} onClick={() => setSelected({ type: 'chat', id: chat.id })}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${selected?.id === chat.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <Avatar src={chat.otherUser?.avatarUrl} name={chat.otherUser?.fullName || 'Chat'} size={36} />
              <span className="text-sm font-medium truncate">{chat.otherUser?.fullName || 'Chat'}</span>
              {selected?.id === chat.id && <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</div>}
            </button>
          ))}
          {groups.filter((g) => g.id !== currentGroupId).length > 0 && (
            <p className="text-xs text-gray-400 font-medium px-1 mt-2 mb-1">Nhóm</p>
          )}
          {groups.filter((g) => g.id !== currentGroupId).map((group) => (
            <button key={group.id} onClick={() => setSelected({ type: 'group', id: group.id })}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${selected?.id === group.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <Avatar src={group.avatarUrl} name={group.name} size={36} />
              <span className="text-sm font-medium truncate">{group.name}</span>
              {selected?.id === group.id && <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">✓</div>}
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={handleForward} disabled={!selected || loading}
            className="w-full bg-[#0068ff] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
            {loading ? 'Đang gửi...' : 'Chuyển tiếp'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GroupWindow ──────────────────────────────────────────────────────────────

export default function GroupWindow({ onStartCall }) {
  const {
    activeGroupId, groupMessages, typingUsers,
    setGroupMessages, prependGroupMessages, setActiveGroupId,
    groups, setGroups, addGroupMessage, updateGroupMessage, updateGroupLastMessage,
    updateGroupMessageReactions, setTyping,
    pinnedMessages, setPinnedMessages,
    groupJoinRequests, setGroupJoinRequests, removeGroupJoinRequest,
    clearGroupUnread, incrementGroupUnread,
  } = useChatStore();
  const { auth } = useAuthStore();

  const [groupDetail, setGroupDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSelectAdmin, setShowSelectAdmin] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showPinned, setShowPinned] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  // ─── AI features state ───────────────────────────────────────────────────────
  const [latestIncomingMsg, setLatestIncomingMsg] = useState(null);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);
  const [lastVisitAt, setLastVisitAt] = useState(null);
  // ────────────────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const msgs = groupMessages[activeGroupId] || [];
  const pinned = pinnedMessages[activeGroupId] || [];
  const pendingRequests = groupJoinRequests[activeGroupId] || [];
  const typingKey = `group_${activeGroupId}`;
  const typingSet = typingUsers[typingKey] || new Set();
  const isTyping = typingSet.size > 0;

  const isAdmin = groupDetail?.isAdmin ?? false;
  const memberCount = groupDetail?.memberCount || 0;
  const isLastAdmin = isAdmin && memberCount > 1;

  // Gọi điện từ group — chỉ cho phép khi nhóm có đúng 2 thành viên (1-1)
  const handleGroupCall = async (callType) => {
    if (memberCount !== 2) return;
    const otherMember = (groupDetail?.members || []).find((m) => m.userId !== auth?.userId);
    if (!otherMember) return;
    try {
      const res = await startChat(otherMember.userId);
      onStartCall?.({
        chatId:    res.data.id,
        peerId:    otherMember.userId,
        peerName:  `${otherMember.firstName} ${otherMember.lastName}`.trim() || 'Người dùng',
        peerAvatar: otherMember.avatarUrl || null,
        callType,
      });
    } catch {}
  };

  const subscribeToGroup = (groupId) => {
    wsService.subscribe(`/topic/group/${groupId}`, (data) => {
      if (data.messageId !== undefined && data.reactions !== undefined && !data.id) {
        updateGroupMessageReactions(groupId, data.messageId, data.reactions);
      } else if (data.id && data.deleted) {
        updateGroupMessage(groupId, data.id, { deleted: true, content: null, mediaUrl: null });
      } else {
        addGroupMessage(groupId, data);
        updateGroupLastMessage(groupId, data);
        // Smart Reply: track tin nhắn TEXT đến từ người khác (không phải bot)
        if (
          data.type === 'TEXT' &&
          data.senderId !== auth?.userId &&
          data.senderId !== AI_BOT_USER_ID &&
          data.content
        ) {
          setLatestIncomingMsg(data);
        }
      }
    });
    wsService.subscribe(`/topic/group/${groupId}/typing`, (data) => {
      const { userId, isTyping } = data;
      if (userId === auth?.userId) return;
      setTyping(`group_${groupId}`, userId, isTyping);
      if (isTyping) {
        setTimeout(() => setTyping(`group_${groupId}`, userId, false), 3000);
      }
    });
    wsService.subscribe(`/topic/group/${groupId}/events`, (data) => {
      handleGroupEvent(groupId, data);
    });
  };

  const unsubscribeFromGroup = (groupId) => {
    wsService.unsubscribe(`/topic/group/${groupId}`);
    wsService.unsubscribe(`/topic/group/${groupId}/typing`);
    wsService.unsubscribe(`/topic/group/${groupId}/events`);
  };

  const handleGroupEvent = (groupId, data) => {
    switch (data.type) {
      case 'MEMBER_REMOVED':
        setGroupDetail((prev) => prev ? ({
          ...prev,
          members: prev.members.filter((m) => m.userId !== data.targetUserId),
          memberCount: Math.max(0, prev.memberCount - 1),
        }) : prev);
        break;
      case 'MEMBER_LEFT':
        setGroupDetail((prev) => prev ? ({
          ...prev,
          members: prev.members.filter((m) => m.userId !== data.targetUserId),
          memberCount: Math.max(0, prev.memberCount - 1),
        }) : prev);
        break;
      case 'MEMBER_ADDED':
        if (data.groupSnapshot) {
          const myMemberAdded = data.groupSnapshot.members?.find((m) => m.userId === auth?.userId);
          setGroupDetail({ ...data.groupSnapshot, isAdmin: myMemberAdded?.admin ?? false });
        }
        break;
      case 'ADMIN_CHANGED':
        if (data.groupSnapshot) {
          const myMember = data.groupSnapshot.members?.find((m) => m.userId === auth?.userId);
          setGroupDetail({ ...data.groupSnapshot, isAdmin: myMember?.admin ?? false });
        }
        break;
      case 'GROUP_UPDATED':
        if (data.groupSnapshot) {
          setGroupDetail(data.groupSnapshot);
          setGroups((prev) => prev.map((g) =>
            g.id === groupId ? { ...g, name: data.groupSnapshot.name, avatarUrl: data.groupSnapshot.avatarUrl } : g
          ));
        }
        break;
      case 'MESSAGE_PINNED':
      case 'MESSAGE_UNPINNED': {
        if (data.pinnedMessages) setPinnedMessages(groupId, data.pinnedMessages);
        // SYSTEM message thật sẽ đến qua main topic WebSocket và tự được add vào chat + group list
        break;
      }
      case 'GROUP_DISSOLVED':
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setActiveGroupId(null);
        break;
      default:
        break;
    }
  };

  const sendGroupTyping = (groupId, isTypingNow) => {
    wsService.publish(`/app/group/${groupId}/typing`, { typing: isTypingNow });
  };

  useEffect(() => {
    if (!activeGroupId) return;

    // Đọc lastVisitAt của group vừa mở, fallback 7 ngày trước nếu lần đầu vào
    const storedVisit = localStorage.getItem(`groupLastVisit_${activeGroupId}`);
    const visitAt = storedVisit || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    setLastVisitAt(visitAt);
    setUnreadOnOpen(0); // sẽ được tính lại sau khi load messages
    setSummaryDismissed(false);
    setLatestIncomingMsg(null);

    clearGroupUnread(activeGroupId);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    setShowPinned(false);

    getGroupDetail(activeGroupId)
      .then((res) => {
        setGroupDetail(res.data);
        setEditName(res.data.name || '');
        setEditDesc(res.data.description || '');
        if (res.data.pinnedMessages) {
          setPinnedMessages(activeGroupId, res.data.pinnedMessages);
        }
        if (res.data.isAdmin) {
          getGroupJoinRequests(activeGroupId)
            .then((r) => setGroupJoinRequests(activeGroupId, r.data))
            .catch(() => {});
        }
      })
      .catch(() => {});

    getGroupMessages(activeGroupId, 0, 30)
      .then((res) => {
        const data = res.data;
        const fetchedMsgs = Array.isArray(data) ? data : (data.content || []);
        const sorted = fetchedMsgs.slice().reverse();
        const alreadyInStore = useChatStore.getState().groupMessages[activeGroupId] || [];
        const fetchedIds = new Set(sorted.map((m) => m.id));
        const latestFetchedTime = sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdDate).getTime() : 0;
        const wsOnlyMsgs = alreadyInStore.filter(
          (m) => !fetchedIds.has(m.id) && new Date(m.createdDate).getTime() > latestFetchedTime
        );
        setGroupMessages(activeGroupId, [...sorted, ...wsOnlyMsgs]);
        setHasMore(fetchedMsgs.length === 30);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);

        // ─── AI: tính unreadOnOpen từ messages thực tế ───────────────────
        // Parse visitAt (UTC ISO) → ms timestamp
        const visitTimestamp = new Date(visitAt).getTime();
        const allLoaded = [...sorted, ...wsOnlyMsgs];
        const unreadMsgCount = allLoaded.filter((m) => {
          if (m.isMine || m.type === 'SYSTEM') return false;
          // Backend trả LocalDateTime không có timezone (server chạy UTC).
          // Append 'Z' để browser parse đúng UTC thay vì local time, tránh lệch 7h.
          const dateStr = m.createdDate;
          const mTime = new Date(dateStr && !dateStr.endsWith('Z') ? dateStr + 'Z' : dateStr).getTime();
          return mTime > visitTimestamp;
        }).length;
        setUnreadOnOpen(unreadMsgCount);
        // ─────────────────────────────────────────────────────────────────
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    subscribeToGroup(activeGroupId);
    return () => {
      // Unsubscribe typing/events khi component unmount (key thay đổi hoặc tab switch).
      // Main topic (/topic/group/${id}) KHÔNG unsubscribe ở đây — useWebSocket sẽ
      // re-subscribe nó với incrementGroupUnread handler khi activeGroupId thay đổi.
      wsService.unsubscribe(`/topic/group/${activeGroupId}/typing`);
      wsService.unsubscribe(`/topic/group/${activeGroupId}/events`);
    };
  }, [activeGroupId]);

  // Lưu lastVisit khi đóng tab/trình duyệt
  useEffect(() => {
    const handleUnload = () => {
      if (activeGroupId) {
        localStorage.setItem(`groupLastVisit_${activeGroupId}`, new Date().toISOString());
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [activeGroupId]);

  useEffect(() => {
    if (!activeGroupId) return;
    const refetch = () => {
      getGroupMessages(activeGroupId, 0, 30)
        .then((res) => {
          const data = res.data;
          const fetchedMsgs = Array.isArray(data) ? data : (data.content || []);
          const sorted = fetchedMsgs.slice().reverse();
          const existing = useChatStore.getState().groupMessages[activeGroupId] || [];
          const fetchedIds = new Set(sorted.map((m) => m.id));
          const latestTime = sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdDate).getTime() : 0;
          const wsOnly = existing.filter((m) => !fetchedIds.has(m.id) && new Date(m.createdDate).getTime() > latestTime);
          setGroupMessages(activeGroupId, [...sorted, ...wsOnly]);
        })
        .catch(() => {});
    };
    wsService.onReconnect(refetch);
    return () => wsService.offReconnect(refetch);
  }, [activeGroupId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const scrollToMessage = useCallback((messageId) => {
    const doScroll = () => {
      const el = document.getElementById(`msg-${messageId}`);
      if (!el) {
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('message-highlight');
      setTimeout(() => el.classList.remove('message-highlight'), 2000);
    };

    const currentMsgs = useChatStore.getState().groupMessages[activeGroupId] || [];
    const isLoaded = currentMsgs.some((m) => m.id === messageId);
    if (isLoaded) {
      doScroll();
    } else {
      getGroupMessages(activeGroupId, 0, 100).then((res) => {
        const data = res.data;
        const msgList = Array.isArray(data) ? data : (data.content || []);
        setGroupMessages(activeGroupId, msgList.slice().reverse());
        setTimeout(doScroll, 150);
      }).catch(() => {});
    }
  }, [activeGroupId]);

  const handleScroll = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop < 100) {
      setLoadingMore(true);
      prevScrollHeightRef.current = container.scrollHeight;
      const nextPage = page + 1;
      try {
        const res = await getGroupMessages(activeGroupId, nextPage, 30);
        const data = res.data;
        const msgList = Array.isArray(data) ? data : (data.content || []);
        if (msgList.length === 0) {
          setHasMore(false);
        } else {
          prependGroupMessages(activeGroupId, msgList.slice().reverse());
          setPage(nextPage);
          setTimeout(() => {
            const c = scrollContainerRef.current;
            if (c) c.scrollTop = c.scrollHeight - prevScrollHeightRef.current;
          }, 50);
        }
      } catch {}
      setLoadingMore(false);
    }
  }, [activeGroupId, page, loadingMore, hasMore]);

  const handleSendText = async (content) => {
    try { await sendGroupMessage(activeGroupId, { content }); }
    catch {}
  };

  const handleSendMedia = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    for (const file of fileArray) {
      try {
        await uploadGroupMedia(activeGroupId, file);
      } catch {
        break;
      }
    }
  };

  const handleTyping = (isTypingNow) => { sendGroupTyping(activeGroupId, isTypingNow); };

  // Rời nhóm: nếu là admin cuối cùng → hiện modal chọn admin mới
  const handleLeave = async () => {
    if (isLastAdmin) {
      setShowSelectAdmin(true);
      return;
    }
    if (!window.confirm('Bạn có chắc muốn rời nhóm?')) return;
    try {
      await leaveGroup(activeGroupId);
      setGroups(groups.filter((g) => g.id !== activeGroupId));
      setActiveGroupId(null);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.includes('admin cuối cùng')) {
        setShowSelectAdmin(true);
      } else {
      }
    }
  };

  const handleLeaveWithNewAdmin = async () => {
    if (!selectedNewAdmin) {; return; }
    try {
      await leaveGroup(activeGroupId, selectedNewAdmin);
      setGroups(groups.filter((g) => g.id !== activeGroupId));
      setActiveGroupId(null);
    } catch (err) {
    }
  };

  const handleSetMemberAsAdmin = async (userId) => {
    if (!window.confirm('Bạn sẽ mất quyền admin sau khi nhường. Tiếp tục?')) return;
    try {
      await setMemberAsAdmin(activeGroupId, userId);
      const res = await getGroupDetail(activeGroupId);
      setGroupDetail(res.data);
    } catch (err) {
    }
  };

  const handleDissolveGroup = async () => {
    if (!window.confirm('Bạn có chắc muốn giải tán nhóm? Thao tác này không thể hoàn tác.')) return;
    try {
      await dissolveGroup(activeGroupId);
      setGroups(groups.filter((g) => g.id !== activeGroupId));
      setActiveGroupId(null);
    } catch {}
  };

  const handleSaveEdit = async () => {
    try {
      await updateGroup(activeGroupId, { name: editName, description: editDesc });
      setGroupDetail((prev) => ({ ...prev, name: editName, description: editDesc }));
      setGroups(groups.map((g) => g.id === activeGroupId ? { ...g, name: editName, description: editDesc } : g));
      setEditMode(false);
    } catch {}
  };

  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      if (isAdmin) {
        await addGroupMembers(activeGroupId, selectedToAdd.map((u) => u.id));
        const res = await getGroupDetail(activeGroupId);
        setGroupDetail(res.data);
      } else {
        await createGroupJoinRequest(activeGroupId, selectedToAdd.map((u) => u.id));
      }
      setShowAddMember(false);
      setSelectedToAdd([]);
    } catch {}
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await approveGroupJoinRequest(activeGroupId, requestId);
      removeGroupJoinRequest(activeGroupId, requestId);
      const res = await getGroupDetail(activeGroupId);
      setGroupDetail(res.data);
    } catch {}
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectGroupJoinRequest(activeGroupId, requestId);
      removeGroupJoinRequest(activeGroupId, requestId);
    } catch {}
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Xóa thành viên này?')) return;
    try {
      await removeGroupMember(activeGroupId, userId);
      setGroupDetail((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
        memberCount: Math.max(0, prev.memberCount - 1),
      }));
    } catch (err) {
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadGroupAvatar(activeGroupId, file);
      const res = await getGroupDetail(activeGroupId);
      setGroupDetail(res.data);
    } catch {}
  };

  if (!activeGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-lg font-medium">Chọn một nhóm</p>
          <p className="text-sm mt-1">để bắt đầu trò chuyện</p>
        </div>
      </div>
    );
  }

  const existingMemberIds = new Set((groupDetail?.members || []).map((m) => m.userId));
  const nonAdminMembers = (groupDetail?.members || []).filter((m) => m.userId !== auth?.userId && !m.admin);

  return (
    <>
      <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <button className="md:hidden p-1 hover:bg-gray-100 rounded-full" onClick={() => setActiveGroupId(null)}>
            <ChevronLeft size={20} />
          </button>
          <Avatar src={groupDetail?.avatarUrl} name={groupDetail?.name} size={40} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{groupDetail?.name}</h3>
            <p className="text-xs text-gray-400">{groupDetail?.memberCount} thành viên</p>
          </div>
          <div className="flex items-center gap-1">
            {memberCount === 2 && (
              <>
                <button
                  onClick={() => handleGroupCall('VOICE')}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  title="Gọi thoại"
                >
                  <Phone size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleGroupCall('VIDEO')}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  title="Gọi video"
                >
                  <VideoIcon size={18} className="text-gray-600" />
                </button>
              </>
            )}
            {pinned.length > 0 && (
              <button onClick={() => setShowPinned(!showPinned)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" title="Tin nhắn đã ghim">
                <Pin size={16} className={showPinned ? 'text-blue-500' : 'text-gray-600'} />
              </button>
            )}
            <button
              onClick={() => setShowMediaPanel((v) => !v)}
              title="Kho lưu trữ"
              className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors ${showMediaPanel ? 'bg-blue-50' : ''}`}>
              <FolderOpen size={18} className={showMediaPanel ? 'text-blue-500' : 'text-gray-600'} />
            </button>
            <button onClick={() => { getContacts().then((r) => setAllUsers(r.data || [])); setShowInfo(true); }}
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <Info size={18} className="text-gray-600" />
              {isAdmin && pendingRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pinned messages banner */}
        {showPinned && pinned.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-yellow-700">📌 Tin nhắn đã ghim ({pinned.length}/3)</span>
              <button onClick={() => setShowPinned(false)} className="text-yellow-600 text-xs hover:underline">Đóng</button>
            </div>
            {pinned.map((msg) => (
              <div key={msg.id} className="flex items-center gap-1 text-xs text-gray-700 bg-white rounded-lg px-3 py-1.5 border border-yellow-100">
                <button
                  onClick={() => { setShowPinned(false); scrollToMessage(msg.id); }}
                  className="flex-1 text-left truncate hover:underline cursor-pointer"
                  title="Nhảy đến tin nhắn"
                >
                  <span className="font-medium text-blue-600 mr-1">{msg.senderName}:</span>
                  {msg.deleted
                    ? <span className="italic text-gray-400">Tin nhắn đã thu hồi</span>
                    : msg.content || `[${msg.type}]`}
                </button>
                <button onClick={async () => {
                  try {
                    const res = await unpinGroupMessage(activeGroupId, msg.id);
                    setPinnedMessages(activeGroupId, res.data);
                  } catch {}
                }} className="flex-shrink-0 text-red-400 hover:text-red-600 ml-1">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* AI Summary Banner */}
        {!summaryDismissed && (
          <SummaryBanner
            groupId={activeGroupId}
            unreadCount={unreadOnOpen}
            since={lastVisitAt}
            onDismiss={() => setSummaryDismissed(true)}
          />
        )}

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-4">
          {loadingMore && (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            msgs.map((msg) => (
              <GroupMessageBubble key={msg.id} message={msg} groupId={activeGroupId} isAdmin={isAdmin} />
            ))
          )}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Smart Reply suggestions */}
        <SmartReplySuggestions
          groupId={activeGroupId}
          latestMessage={latestIncomingMsg}
          onSelect={(text) => handleSendText(text)}
          inputValue=""
        />

        {/* Input */}
        <MessageInput
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onTyping={handleTyping}
          placeholder="Nhập tin nhắn... (@AI để hỏi trợ lý)"
        />
      </div>

      {/* Group info modal */}
      <Modal isOpen={showInfo} onClose={() => { setShowInfo(false); setEditMode(false); }} title="Thông tin nhóm" size="md">
        <div className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar src={groupDetail?.avatarUrl} name={groupDetail?.name} size={80} />
              {isAdmin && (
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors">
                  <Camera size={14} className="text-white" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>
            {editMode ? (
              <div className="w-full space-y-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Tên nhóm" />
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="Mô tả nhóm" />
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)}
                    className="flex-1 border border-gray-200 py-2 rounded-xl text-sm hover:bg-gray-50">Hủy</button>
                  <button onClick={handleSaveEdit}
                    className="flex-1 bg-[#0068ff] text-white py-2 rounded-xl text-sm hover:bg-blue-600">Lưu</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="font-bold text-gray-800 text-lg">{groupDetail?.name}</h3>
                  {groupDetail?.description && <p className="text-sm text-gray-500 mt-1">{groupDetail.description}</p>}
                </div>
                {isAdmin && (
                  <button onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                    <Pencil size={14} /> Chỉnh sửa
                  </button>
                )}
              </>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700 text-sm">Thành viên ({groupDetail?.members?.length || 0})</h4>
              <button onClick={() => { getContacts().then((r) => setAllUsers(r.data || [])); setShowAddMember(true); }}
                className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                <UserPlus size={14} /> Thêm
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(groupDetail?.members || []).map((member) => (
                <div key={member.userId} className="flex items-center gap-3">
                  <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size={36} online={member.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.firstName} {member.lastName}
                      {member.admin && <span className="ml-1 text-xs text-blue-500 font-normal">(Admin)</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                  {isAdmin && member.userId !== auth?.userId && (
                    <div className="flex items-center gap-1">
                      {!member.admin && (
                        <button onClick={() => handleSetMemberAsAdmin(member.userId)}
                          className="text-xs text-blue-400 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-blue-50">
                          Nhường admin
                        </button>
                      )}
                      {!member.admin && (
                        <button onClick={() => handleRemoveMember(member.userId)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                          Xóa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Join requests — chỉ admin */}
          {isAdmin && pendingRequests.length > 0 && (
            <div className="mb-2">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">
                Yêu cầu tham gia ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                    <Avatar src={req.requestedByAvatarUrl} name={req.requestedByName} size={28} />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="font-medium text-gray-800">{req.requestedByName}</span>
                      <span className="text-gray-400"> muốn thêm </span>
                      <span className="font-medium text-gray-800">{req.targetUserName}</span>
                    </div>
                    <button onClick={() => handleApproveRequest(req.id)}
                      className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-lg flex-shrink-0">
                      Đồng ý
                    </button>
                    <button onClick={() => handleRejectRequest(req.id)}
                      className="text-xs text-gray-500 hover:text-red-500 px-1 py-1 flex-shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave group */}
          <button onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-sm font-medium">
            <LogOut size={16} />
            {isLastAdmin ? 'Rời nhóm (cần chọn admin mới)' : 'Rời nhóm'}
          </button>

          {/* Dissolve group */}
          {isAdmin && (
            <button onClick={handleDissolveGroup}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium">
              ⚠️ Giải tán nhóm
            </button>
          )}
        </div>
      </Modal>

      {/* Add member modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Thêm thành viên" size="sm">
        <div className="p-4 space-y-3">
          <div className="max-h-64 overflow-y-auto space-y-1">
            {allUsers
              .filter((u) => !existingMemberIds.has(u.id))
              .map((user) => {
                const isSelected = !!selectedToAdd.find((u2) => u2.id === user.id);
                return (
                  <button key={user.id} onClick={() => setSelectedToAdd((prev) =>
                    isSelected ? prev.filter((u2) => u2.id !== user.id) : [...prev, user]
                  )}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={36} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    {isSelected && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs">✓</div>}
                  </button>
                );
              })}
          </div>
          <button onClick={handleAddMembers} disabled={selectedToAdd.length === 0}
            className="w-full bg-[#0068ff] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
            Thêm ({selectedToAdd.length})
          </button>
        </div>
      </Modal>

      {/* Select new admin modal (khi admin cuối cùng rời nhóm) */}
      <Modal isOpen={showSelectAdmin} onClose={() => { setShowSelectAdmin(false); setSelectedNewAdmin(null); }} title="Chọn admin mới" size="sm">
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">Bạn là admin duy nhất. Hãy chọn một thành viên làm admin mới trước khi rời nhóm.</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {nonAdminMembers.map((member) => (
              <button key={member.userId}
                onClick={() => setSelectedNewAdmin(member.userId)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${selectedNewAdmin === member.userId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size={36} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                </div>
                {selectedNewAdmin === member.userId && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs">✓</div>
                )}
              </button>
            ))}
          </div>
          <button onClick={handleLeaveWithNewAdmin} disabled={!selectedNewAdmin}
            className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            Xác nhận rời nhóm
          </button>
        </div>
      </Modal>

      {/* Media Panel */}
      {showMediaPanel && (
        <GroupMediaPanel
          groupId={activeGroupId}
          onClose={() => setShowMediaPanel(false)}
        />
      )}
      </div>
    </>
  );
}
