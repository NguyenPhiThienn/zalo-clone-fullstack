import { useState } from 'react';
import { MoreHorizontal, Smile, Copy, RotateCcw, Trash2, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { recallMessage, deleteMessageForMe, toggleReaction, deleteReaction, sendMessage } from '../../api/message';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const AI_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

function getMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

async function downloadFile(mediaUrl, filename) {
  try {
    // Lấy key (uuid.ext) từ S3 URL hoặc relative path
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
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: vi });
  } catch {
    return '';
  }
}

export default function MessageBubble({ message, chatId, isGroup = false }) {
  const { auth } = useAuthStore();
  const { updateMessage, updateMessageReactions } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const isBot = message.senderId?.toString() === AI_BOT_USER_ID;
  const isMine = isGroup
    ? message.isMine || message.senderId === auth?.userId
    : message.senderId === auth?.userId;

  // Không hiển thị tin nhắn nếu bị xóa bởi mình
  if (message.hiddenForMe) {
    return null;
  }

  const handleRecall = async () => {
    try {
      await recallMessage(message.id);
      updateMessage(chatId, message.id, { deleted: true, content: '' });
      toast.success('Đã thu hồi tin nhắn');
    } catch {
      toast.error('Không thể thu hồi tin nhắn');
    }
    setShowMenu(false);
    setShowActions(false);
  };

  const handleDelete = async () => {
    try {
      await deleteMessageForMe(message.id);
      updateMessage(chatId, message.id, { hiddenForMe: true });
      toast.success('Đã xóa tin nhắn');
    } catch {
      toast.error('Không thể xóa tin nhắn');
    }
    setShowMenu(false);
    setShowActions(false);
  };

  const handleCopy = () => {
    const textToCopy = message.content || '';
    navigator.clipboard.writeText(textToCopy);
    toast.success('Đã sao chép');
    setShowMenu(false);
  };

  const handleForward = () => {
    setShowForwardModal(true);
    setShowMenu(false);
  };

  const handleReaction = async (emojiData) => {
    setShowEmoji(false);
    setShowActions(false);
    try {
      const res = await toggleReaction(message.id, emojiData.emoji);
      if (Array.isArray(res.data)) {
        updateMessageReactions(chatId, message.id, res.data);
      }
    } catch {}
  };

  const handleRemoveReaction = async () => {
    try {
      await deleteReaction(message.id);
      const existing = (message.reactions || []).filter((r) => r.userId !== auth?.userId);
      updateMessageReactions(chatId, message.id, existing);
    } catch {}
  };

  const myReaction = (message.reactions || []).find((r) => r.userId === auth?.userId);

  const renderContent = () => {
    if (message.deleted) {
      return (
        <span className="italic text-gray-400 text-sm">
          Tin nhắn đã được thu hồi
        </span>
      );
    }

    const type = message.type || 'TEXT';
    const mediaUrl = getMediaUrl(message.mediaUrl);

    if (type === 'IMAGE' && mediaUrl) {
      const filename = mediaUrl.split('/').pop()?.split('?')[0] || 'image';
      return (
        <div className="flex flex-col gap-1">
          <img
            src={mediaUrl}
            alt="Hình ảnh"
            onClick={() => setImagePreview(mediaUrl)}
            className="rounded-xl cursor-pointer max-w-[240px] max-h-[240px] object-cover"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setImagePreview(mediaUrl)}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              title="Xem ảnh"
            >
              🔍 Xem
            </button>
            <button
              onClick={() => downloadFile(mediaUrl, filename)}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              title="Tải xuống"
            >
              ⬇ Tải về
            </button>
          </div>
        </div>
      );
    }

    if (type === 'VIDEO' && mediaUrl) {
      const filename = mediaUrl.split('/').pop()?.split('?')[0] || 'video';
      return (
        <div className="flex flex-col gap-1">
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            className="rounded-xl max-w-[320px] max-h-[240px]"
          />
          <div className="flex gap-1">
            <button
              onClick={() => setVideoPreview(mediaUrl)}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              title="Xem toàn màn hình"
            >
              ⛶ Toàn màn hình
            </button>
            <button
              onClick={() => downloadFile(mediaUrl, filename)}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              title="Tải xuống"
            >
              ⬇ Tải về
            </button>
          </div>
        </div>
      );
    }

    if ((type === 'FILE' || type === 'AUDIO') && mediaUrl) {
      const displayName = message.fileName
        || message.mediaUrl?.split('/').pop()?.split('?')[0]
        || 'Tệp đính kèm';
      return (
        <div className="flex items-center gap-2">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm underline min-w-0"
            title="Mở file"
          >
            📎 <span className="truncate max-w-[180px]">{displayName}</span>
          </a>
          <button
            onClick={() => downloadFile(mediaUrl, displayName)}
            className="flex-shrink-0 text-xs py-1 px-2 rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
            title="Tải xuống"
          >
            ⬇
          </button>
        </div>
      );
    }

    return <span className="text-sm whitespace-pre-wrap break-words">{message.content}</span>;
  };

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div
        className={`flex items-end gap-2 px-4 py-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { if (!showEmoji) setShowActions(false); }}
      >
        <div className={`relative flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[65%]`}>
          {/* Sender name for group or bot */}
          {isGroup && !isMine && message.senderName && (
            <span className={`text-xs font-medium mb-1 ml-1 ${isBot ? 'text-violet-600' : 'text-blue-600'}`}>
              {isBot ? '🤖 ' : ''}{message.senderName}
            </span>
          )}
          {/* Bot label in 1-1 chat */}
          {!isGroup && isBot && (
            <span className="text-xs text-violet-600 font-medium mb-1 ml-1">
              🤖 Trợ lý AI
            </span>
          )}

          {/* Bubble */}
          <div
            className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
              message.deleted
                ? 'bg-gray-100 text-gray-400'
                : isMine
                ? 'bg-[#0068ff] text-white rounded-br-sm'
                : isBot
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-bl-sm'
                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
            }`}
          >
            {renderContent()}
            <div
              className={`text-[10px] mt-1 ${
                isMine ? 'text-blue-100 text-right' : isBot ? 'text-violet-200 text-right' : 'text-gray-400 text-right'
              }`}
            >
              {formatTime(message.createdAt || message.createdDate)}
              {isMine && (
                <>
                  {message.state === 'SEEN' && (
                    <span className="ml-1 text-white font-semibold" title="Đã xem">✓✓</span>
                  )}
                  {message.state === 'DELIVERED' && (
                    <span className="ml-1 text-white/40" title="Đã nhận">✓✓</span>
                  )}
                  {(!message.state || message.state === 'SENT') && (
                    <span className="ml-1 text-white/40" title="Chưa nhận">✓</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div
              className={`flex items-center gap-1 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}
            >
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={myReaction?.emoji === emoji ? handleRemoveReaction : undefined}
                  className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-gray-600">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!message.deleted && showActions && (
          <div className={`flex items-center gap-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
              >
                <Smile size={14} className="text-gray-500" />
              </button>
              {showEmoji && (
                <div
                  className={`absolute bottom-8 z-30 ${isMine ? 'right-0' : 'left-0'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onEmojiClick={handleReaction}
                    width={300}
                    height={350}
                    searchPlaceHolder="Tìm emoji..."
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
                title="Tùy chọn"
              >
                <MoreHorizontal size={14} className="text-gray-500" />
              </button>
              {showMenu && (
                <div className={`absolute bottom-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 ${isMine ? 'right-0' : 'left-0'}`}>
                  {message.content && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Copy size={14} />
                      Sao chép
                    </button>
                  )}
                  <button
                    onClick={handleForward}
                    className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 size={14} />
                    Chuyển tiếp
                  </button>
                  {isMine && (
                    <>
                      <button
                        onClick={handleRecall}
                        className="flex items-center gap-2 px-3 py-2 w-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Thu hồi
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}

      {/* Video fullscreen modal */}
      {videoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setVideoPreview(null)}
        >
          <video
            src={videoPreview}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Forward modal */}
      {showForwardModal && (
        <ForwardModal
          message={message}
          onClose={() => setShowForwardModal(false)}
        />
      )}
    </>
  );
}

function ForwardModal({ message, onClose }) {
  const { chats } = useChatStore();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleForwardMessage = async () => {
    if (!selectedChatId) {
      toast.error('Vui lòng chọn cuộc trò chuyện');
      return;
    }

    setLoading(true);
    try {
      const newMessage = {
        content: message.content || '',
        chatId: selectedChatId,
        type: message.type || 'TEXT',
      };
      await sendMessage(newMessage);
      toast.success('Đã chuyển tiếp tin nhắn');
      onClose();
    } catch {
      toast.error('Không thể chuyển tiếp tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Chuyển tiếp tin nhắn</h2>
          <p className="text-xs text-gray-500 mt-1">Chọn cuộc trò chuyện để gửi</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {Array.isArray(chats) && chats.length > 0 ? (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  selectedChatId === chat.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedChatId === chat.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {selectedChatId === chat.id && <span className="text-white text-xs">✓</span>}
                </div>
                <Avatar src={chat.avatarUrl} name={chat.chatName} size={36} online={chat.recipientOnline} />
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{chat.chatName || 'Cuộc trò chuyện'}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">Không có cuộc trò chuyện</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleForwardMessage}
            disabled={!selectedChatId || loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
}
