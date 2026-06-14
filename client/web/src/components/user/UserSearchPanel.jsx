import { useState, useEffect, useCallback } from 'react';
import { Search, MessageCircle, Loader, UserPlus, UserCheck, X, Check } from 'lucide-react';
import { searchUsers } from '../../api/user';
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from '../../api/friendRequest';
import { startChat } from '../../api/chat';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function UserSearchPanel() {
  const {
    setActiveChatId, setActiveTab, setChats,
    pendingRequests, removePendingRequest, addContact, addSentRequest,
    setViewingProfileId,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debounced.trim().length === 0) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchUsers(debounced)
      .then((res) => setSearchResults(res.data || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debounced]);

  const handleSendRequest = async (user) => {
    setLoadingId(user.id);
    try {
      const res = await sendFriendRequest(user.id);
      addSentRequest(res.data);
      setSearchResults((prev) => prev.map((u) => u.id === user.id ? { ...u, friendshipStatus: 'PENDING_SENT' } : u));
      toast.success('Đã gửi lời mời kết bạn');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Không thể gửi lời mời');
    } finally { setLoadingId(null); }
  };

  const handleAccept = async (user) => {
    const req = pendingRequests.find((r) => r.senderId === user.id);
    if (!req) return;
    setLoadingId(user.id);
    try {
      await acceptFriendRequest(req.id);
      removePendingRequest(req.id);
      addContact({ ...user, friendshipStatus: 'ACCEPTED' });
      setSearchResults((prev) => prev.map((u) => u.id === user.id ? { ...u, friendshipStatus: 'ACCEPTED' } : u));
      toast.success('Đã chấp nhận lời mời kết bạn');
    } catch { toast.error('Không thể chấp nhận lời mời'); }
    finally { setLoadingId(null); }
  };

  const handleReject = async (user) => {
    const req = pendingRequests.find((r) => r.senderId === user.id);
    if (!req) return;
    setLoadingId(user.id + '_reject');
    try {
      await rejectFriendRequest(req.id);
      removePendingRequest(req.id);
      setSearchResults((prev) => prev.map((u) => u.id === user.id ? { ...u, friendshipStatus: 'NONE' } : u));
    } catch { toast.error('Không thể từ chối'); }
    finally { setLoadingId(null); }
  };

  const handleStartChat = async (userId) => {
    setLoadingId(userId + '_chat');
    try {
      const res = await startChat(userId);
      const chat = res.data;
      setChats((prev) => Array.isArray(prev) ? (prev.find((c) => c.id === chat.id) ? prev : [chat, ...prev]) : [chat]);
      setActiveChatId(chat.id);
      setActiveTab('chats');
    } catch { toast.error('Không thể bắt đầu cuộc trò chuyện'); }
    finally { setLoadingId(null); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700 text-sm mb-3 px-1">Tìm kiếm</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!debounced.trim() && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <Search size={36} className="mx-auto mb-3 opacity-20" />
            <p>Nhập tên hoặc email để tìm kiếm</p>
          </div>
        )}
        {searchLoading && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!searchLoading && debounced.trim() && searchResults.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">Không tìm thấy người dùng</div>
        )}
        {searchResults.map((user) => {
          const status = user.friendshipStatus || 'NONE';
          return (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <button onClick={() => setViewingProfileId(user.id)} className="flex-shrink-0">
                <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName || ''}`} size={44} online={user.online} />
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingProfileId(user.id)}>
                <p className="font-medium text-sm text-gray-800 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {!user.banned && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {user.blockStatus && user.blockStatus !== 'NONE' ? (
                    <span className="text-xs text-gray-400 px-2">Không thể kết bạn</span>
                  ) : (
                    <>
                      {status === 'NONE' && (
                        <button onClick={() => handleSendRequest(user)} disabled={loadingId === user.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 text-xs font-medium transition-colors disabled:opacity-50">
                          {loadingId === user.id ? <Loader size={13} className="animate-spin" /> : <UserPlus size={13} />} Kết bạn
                        </button>
                      )}
                      {status === 'PENDING_SENT' && (
                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                          <UserCheck size={13} /> Đã gửi
                        </span>
                      )}
                      {status === 'PENDING_RECEIVED' && (
                        <>
                          <button onClick={() => handleAccept(user)} disabled={loadingId === user.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 text-xs font-medium transition-colors disabled:opacity-50">
                            {loadingId === user.id ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Chấp nhận
                          </button>
                          <button onClick={() => handleReject(user)} disabled={loadingId === user.id + '_reject'}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 text-xs font-medium transition-colors disabled:opacity-50">
                            {loadingId === user.id + '_reject' ? <Loader size={13} className="animate-spin" /> : <X size={13} />} Từ chối
                          </button>
                        </>
                      )}
                      {status === 'ACCEPTED' && (
                        <button onClick={() => handleStartChat(user.id)} disabled={loadingId === user.id + '_chat'}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 text-xs font-medium transition-colors disabled:opacity-50">
                          {loadingId === user.id + '_chat' ? <Loader size={13} className="animate-spin" /> : <MessageCircle size={13} />} Nhắn tin
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
