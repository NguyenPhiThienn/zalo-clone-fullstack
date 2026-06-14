import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import wsService from '../../services/websocket';

export default function BannedModal() {
  const { bannedInfo, clearBannedInfo, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!bannedInfo) return null;

  const handleOk = () => {
    clearBannedInfo();
    wsService.disconnect();
    logout();
    navigate('/login');
  };

  const formatBanUntil = (banUntil) => {
    if (!banUntil) return null;
    try {
      return new Date(banUntil).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return null; }
  };

  const until = formatBanUntil(bannedInfo.banUntil);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 py-5 text-center border-b border-red-100">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldOff size={26} className="text-red-500" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Tài khoản bị khóa</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Tài khoản của bạn đã bị quản trị viên khóa.
          </p>
          {bannedInfo.reason && (
            <p className="text-sm text-gray-800 font-medium bg-gray-50 rounded-xl px-4 py-2.5">
              Lý do: {bannedInfo.reason}
            </p>
          )}
          {until ? (
            <p className="text-xs text-gray-400">Khóa đến: {until}</p>
          ) : (
            <p className="text-xs text-gray-400">Tài khoản bị khóa vĩnh viễn</p>
          )}
        </div>

        {/* Action */}
        <div className="px-6 pb-5">
          <button
            onClick={handleOk}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Tôi đã hiểu, đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
