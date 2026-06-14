import React, { useState } from 'react';
import { LogOut, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import wsService from '../../services/websocket';
import { logout as logoutApi } from '../../api/auth';
import Avatar from '../common/Avatar';
import ProfileModal from '../user/ProfileModal';

export default function Header() {
  const { auth, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {}
    wsService.disconnect();
    logout();
    navigate('/login');
  };

  const fullName = [auth?.firstName, auth?.lastName].filter(Boolean).join(' ');

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors w-full"
        >
          <Avatar
            key={auth?.avatarUrl}
            src={auth?.avatarUrl}
            name={fullName || auth?.email}
            size={36}
            online={true}
          />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute left-0 bottom-14 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-52">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {fullName || 'Người dùng'}
                </p>
                <p className="text-xs text-gray-500 truncate">{auth?.email}</p>
              </div>
              <button
                className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                onClick={() => { setShowProfile(true); setShowMenu(false); }}
              >
                <Settings size={16} />
                Cài đặt tài khoản
              </button>
              {auth?.role === 'ADMIN' && (
                <button
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                  onClick={() => { navigate('/admin'); setShowMenu(false); }}
                >
                  <Shield size={16} />
                  Quản trị
                </button>
              )}
              <div className="border-t border-gray-100 mt-1">
                <button
                  className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-red-50 text-sm text-red-600 transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
