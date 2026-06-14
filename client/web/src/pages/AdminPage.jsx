import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, Group, ClipboardList, MessageCircle, LogOut, ShieldCheck, Flag,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import wsService from '../services/websocket';
import { logout as logoutApi } from '../api/auth';
import Avatar from '../components/common/Avatar';
import Stats from '../components/admin/Stats';
import UserManagement from '../components/admin/UserManagement';
import GroupManagement from '../components/admin/GroupManagement';
import AuditLog from '../components/admin/AuditLog';
import AdminChatPanel from '../components/admin/AdminChatPanel';
import Reports from '../components/admin/Reports';

const tabs = [
  { id: 'stats', icon: BarChart3, label: 'Thống kê' },
  { id: 'users', icon: Users, label: 'Người dùng' },
  { id: 'groups', icon: Group, label: 'Nhóm' },
  { id: 'audit', icon: ClipboardList, label: 'Nhật ký' },
  { id: 'reports', icon: Flag, label: 'Báo cáo' },
  { id: 'support', icon: MessageCircle, label: 'Hỗ trợ' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('stats');
  const [pendingChatUserId, setPendingChatUserId] = useState(null);
  const { auth, logout } = useAuthStore();
  const navigate = useNavigate();

  // Reconnect WebSocket nếu refresh thẳng vào /admin
  useEffect(() => {
    if (auth?.accessToken && !wsService.isConnected()) {
      wsService.connect(auth.accessToken);
    }
  }, [auth?.accessToken]);

  const handleChatUser = (userId) => {
    setPendingChatUserId(userId);
    setActiveTab('support');
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    wsService.disconnect();
    logout();
    navigate('/login');
  };

  const fullName = [auth?.firstName, auth?.lastName].filter(Boolean).join(' ');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-[#0068ff] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-blue-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Quản trị</p>
              <p className="text-blue-200 text-xs">Hệ thống</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#0068ff] shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Admin info + Logout */}
        <div className="px-3 py-4 border-t border-blue-500/30 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <Avatar src={auth?.avatarUrl} name={fullName || auth?.email} size={32} />
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{fullName || 'Admin'}</p>
              <p className="text-blue-200 text-[10px] truncate">{auth?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-200 hover:bg-red-500/20 hover:text-white transition-all"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex-shrink-0">
          <h1 className="text-base font-semibold text-gray-800">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
        </div>

        {/* Tab content */}
        <div className={`flex-1 overflow-auto ${activeTab === 'support' ? '' : 'p-6'}`}>
          {activeTab === 'stats' && <Stats />}
          {activeTab === 'users' && <UserManagement onChatUser={handleChatUser} />}
          {activeTab === 'groups' && <GroupManagement />}
          {activeTab === 'audit' && <AuditLog />}
          {activeTab === 'reports' && <Reports onChatUser={handleChatUser} />}
          {activeTab === 'support' && <AdminChatPanel initialUserId={pendingChatUserId} />}
        </div>
      </div>
    </div>
  );
}
