import { useState, useEffect } from 'react';
import { MessageCircle, Loader, UserPlus, Users, X, Check } from 'lucide-react';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  getContacts,
  getPendingRequests,
  unfriend,
} from '../../api/friendRequest';
import { startChat } from '../../api/chat';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function UserSearch() {
  const {
    setActiveChatId,
    setActiveTab,
    setChats,
    contacts,
    setContacts,
    removeContact,
    pendingRequests,
    setPendingRequests,
    removePendingRequest,
    addContact,
    setViewingProfileId,
  } = useChatStore();

  const [subTab, setSubTab] = useState('friends'); // 'friends' | 'requests'
  const [loadingId, setLoadingId] = useState(null);

  // Load contacts and pending requests on mount
  useEffect(() => {
    getContacts()
      .then((res) => setContacts(res.data || []))
      .catch(() => {});
    getPendingRequests()
      .then((res) => setPendingRequests(res.data || []))
      .catch(() => {});
  }, []);

  const handleAcceptRequest = async (req) => {
    setLoadingId(req.id);
    try {
      await acceptFriendRequest(req.id);
      removePendingRequest(req.id);
      addContact({
        id: req.senderId,
        firstName: req.senderName.split(' ')[0],
        lastName: req.senderName.split(' ').slice(1).join(' '),
        email: req.senderEmail,
        avatarUrl: req.senderAvatarUrl,
        online: req.senderOnline,
        friendshipStatus: 'ACCEPTED',
      });
      toast.success('Đã chấp nhận lời mời kết bạn');
    } catch {
      toast.error('Không thể chấp nhận lời mời');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectRequest = async (req) => {
    setLoadingId(req.id + '_reject');
    try {
      await rejectFriendRequest(req.id);
      removePendingRequest(req.id);
      toast.success('Đã từ chối lời mời');
    } catch {
      toast.error('Không thể từ chối lời mời');
    } finally {
      setLoadingId(null);
    }
  };

  const handleStartChat = async (userId) => {
    setLoadingId(userId + '_chat');
    try {
      const res = await startChat(userId);
      const chat = res.data;
      setChats((prev) => {
        if (Array.isArray(prev)) {
          if (prev.find((c) => c.id === chat.id)) return prev;
          return [chat, ...prev];
        }
        return [chat];
      });
      setActiveChatId(chat.id);
      setActiveTab('chats');
    } catch {
      toast.error('Không thể bắt đầu cuộc trò chuyện');
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnfriend = async (friendId) => {
    setLoadingId(friendId + '_unfriend');
    try {
      await unfriend(friendId);
      removeContact(friendId);
      toast.success('Đã hủy kết bạn');
    } catch {
      toast.error('Không thể hủy kết bạn');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700 text-sm px-1">Danh bạ</h2>
      </div>

      <>
        {/* Sub-tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setSubTab('friends')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                subTab === 'friends'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={15} />
              Bạn bè ({contacts.length})
            </button>
            <button
              onClick={() => setSubTab('requests')}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                subTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus size={15} />
              Lời mời
              {pendingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {subTab === 'friends' && (
              <>
                {contacts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    Chưa có bạn bè nào. Hãy tìm kiếm và kết bạn!
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        onClick={() => setViewingProfileId(contact.id)}
                        className="cursor-pointer flex-shrink-0"
                      >
                        <Avatar
                          src={contact.avatarUrl}
                          name={`${contact.firstName} ${contact.lastName || ''}`}
                          size={44}
                          online={contact.online}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleStartChat(contact.id)}
                          disabled={loadingId === contact.id + '_chat'}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors disabled:opacity-50"
                          title="Nhắn tin"
                        >
                          {loadingId === contact.id + '_chat' ? (
                            <Loader size={15} className="animate-spin" />
                          ) : (
                            <MessageCircle size={15} />
                          )}
                        </button>
                        <button
                          onClick={() => handleUnfriend(contact.id)}
                          disabled={loadingId === contact.id + '_unfriend'}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Hủy kết bạn"
                        >
                          {loadingId === contact.id + '_unfriend' ? (
                            <Loader size={15} className="animate-spin" />
                          ) : (
                            <X size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {subTab === 'requests' && (
              <>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <UserPlus size={32} className="mx-auto mb-2 opacity-30" />
                    Không có lời mời kết bạn nào
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        onClick={() => setViewingProfileId(req.senderId)}
                        className="cursor-pointer flex-shrink-0"
                      >
                        <Avatar
                          src={req.senderAvatarUrl}
                          name={req.senderName}
                          size={44}
                          online={req.senderOnline}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{req.senderName}</p>
                        <p className="text-xs text-gray-400 truncate">{req.senderEmail}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          disabled={loadingId === req.id}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                          title="Chấp nhận"
                        >
                          {loadingId === req.id ? (
                            <Loader size={15} className="animate-spin" />
                          ) : (
                            <Check size={15} />
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          disabled={loadingId === req.id + '_reject'}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Từ chối"
                        >
                          {loadingId === req.id + '_reject' ? (
                            <Loader size={15} className="animate-spin" />
                          ) : (
                            <X size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </>
    </div>
  );
}
