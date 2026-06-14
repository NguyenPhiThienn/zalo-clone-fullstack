import React, { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { getMyChats, deleteChat } from '../../api/chat';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: vi });
  } catch {
    return '';
  }
}

export default function ChatList() {
  const { chats, setChats, activeChatId, setActiveChatId, removeChat, setViewingProfileId } = useChatStore();
  const { auth } = useAuthStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // chat object to delete
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyChats()
      .then((res) => setChats(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = chats.filter((c) =>
    c.chatName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteChat(confirmDelete.id);
      removeChat(confirmDelete.id);
      toast.success('Đã xóa cuộc trò chuyện');
    } catch {
      toast.error('Không thể xóa cuộc trò chuyện');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Không có cuộc trò chuyện nào
          </div>
        )}

        {filtered.map((chat) => {
          const isActive = activeChatId === chat.id;
          const isHovered = hoveredId === chat.id;

          return (
            <div
              key={chat.id}
              className={`relative flex items-center gap-3 px-4 py-3 w-full text-left transition-colors cursor-pointer ${
                isActive ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
              }`}
              onClick={() => setActiveChatId(chat.id)}
              onMouseEnter={() => setHoveredId(chat.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (chat.recipientId) setViewingProfileId(chat.recipientId);
                }}
                className="flex-shrink-0 cursor-pointer"
              >
                <Avatar
                  src={chat.avatarUrl}
                  name={chat.chatName}
                  size={44}
                  online={chat.recipientOnline}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm truncate ${isActive ? 'text-blue-600' : 'text-gray-800'}`}>
                    {chat.chatName || 'Người dùng'}
                  </span>
                  {!isHovered && (
                    <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                      {formatTime(chat.lastMessageTime)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-500 truncate max-w-[150px]">
                    {chat.lastMessage
                      ? chat.lastMessageType === 'IMAGE'
                        ? '📷 Hình ảnh'
                        : chat.lastMessageType === 'VIDEO'
                        ? '🎥 Video'
                        : chat.lastMessageType === 'FILE'
                        ? '📎 Tệp đính kèm'
                        : chat.lastMessage
                      : 'Chưa có tin nhắn'}
                  </span>
                  {chat.unreadCount > 0 && !isHovered && (
                    <span className="ml-2 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button — visible on hover */}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(chat);
                  }}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Xóa cuộc trò chuyện"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm delete dialog */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Xóa cuộc trò chuyện"
      >
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-1">
            Bạn có chắc muốn xóa cuộc trò chuyện với{' '}
            <span className="font-semibold text-gray-800">{confirmDelete?.chatName}</span>?
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Tất cả tin nhắn sẽ bị xóa vĩnh viễn và không thể khôi phục.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
