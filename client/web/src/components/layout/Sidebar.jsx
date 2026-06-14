import React from 'react';
import { MessageCircle, Users, Bot, BookUser, Search } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import Header from './Header';
import ChatList from '../chat/ChatList';
import GroupList from '../group/GroupList';
import AiChat from '../ai/AiChat';
import UserSearch from '../user/UserSearch';
import UserSearchPanel from '../user/UserSearchPanel';

const tabs = [
  { id: 'chats', icon: MessageCircle, label: 'Tin nhắn' },
  { id: 'groups', icon: Users, label: 'Nhóm' },
  { id: 'ai', icon: Bot, label: 'Trợ lý AI' },
  { id: 'search', icon: Search, label: 'Tìm kiếm' },
  { id: 'contacts', icon: BookUser, label: 'Danh bạ' },
];

export default function Sidebar() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex h-full">
      {/* Icon nav rail */}
      <div className="w-16 bg-[#0068ff] flex flex-col items-center py-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={22} />
            </button>
          );
        })}
        <div className="flex-1" />
        <Header />
      </div>

      {/* Panel */}
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        {activeTab === 'chats' && <ChatList />}
        {activeTab === 'groups' && <GroupList />}
        {activeTab === 'ai' && <AiChat />}
        {activeTab === 'search' && <UserSearchPanel />}
        {activeTab === 'contacts' && <UserSearch />}
      </div>
    </div>
  );
}
