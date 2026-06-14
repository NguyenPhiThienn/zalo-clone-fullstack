import React from 'react';
import { ShieldAlert } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import wsService from '../../services/websocket';

export default function SessionReplacedModal() {
  const { sessionReplaced, logout } = useAuthStore();

  if (!sessionReplaced) return null;

  const handleConfirm = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
        <div className="bg-red-50 px-6 pt-8 pb-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Phiên đăng nhập bị thay thế</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Tài khoản của bạn vừa đăng nhập ở một thiết bị khác.
            <br />
            Bạn sẽ bị đăng xuất khỏi phiên này.
          </p>
        </div>
        <div className="px-6 py-5">
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm transition-colors"
          >
            Tôi đã hiểu, đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
