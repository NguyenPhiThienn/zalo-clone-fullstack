import React, { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { getMyGroups } from '../../api/group';
import useChatStore from '../../store/chatStore';
import Avatar from '../common/Avatar';
import CreateGroupModal from './CreateGroupModal';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: vi });
  } catch {
    return '';
  }
}

export default function GroupList() {
  const { groups, setGroups, activeGroupId, setActiveGroupId } = useChatStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyGroups()
      .then((res) => setGroups(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhóm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0068ff] text-white hover:bg-blue-600 transition-colors flex-shrink-0"
              title="Tạo nhóm mới"
            >
              <Plus size={18} />
            </button>
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
              <p>Chưa có nhóm nào</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 text-blue-500 hover:underline text-xs"
              >
                Tạo nhóm mới
              </button>
            </div>
          )}

          {filtered.map((group) => {
            const isActive = activeGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <Avatar
                  src={group.avatarUrl}
                  name={group.name}
                  size={44}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium text-sm truncate ${isActive ? 'text-blue-600' : 'text-gray-800'}`}>
                      {group.name}
                    </span>
                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {formatTime(group.lastMessageTime)}
                      </span>
                      {!isActive && group.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {group.unreadCount > 99 ? '99+' : group.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5">
                    <span className={`text-xs truncate block max-w-[200px] ${!isActive && group.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {group.lastMessage
                        ? group.lastMessageType === 'SYSTEM'
                          ? group.lastMessage
                          : `${group.lastMessageSenderName ? group.lastMessageSenderName + ': ' : ''}${
                              group.lastMessageType === 'IMAGE'
                                ? '📷 Hình ảnh'
                                : group.lastMessageType === 'VIDEO'
                                ? '🎥 Video'
                                : group.lastMessage
                            }`
                        : `${group.memberCount} thành viên`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <CreateGroupModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
