import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import useAuthStore from '../store/authStore';
import wsService from '../services/websocket';
import toast from 'react-hot-toast';

const daysRemaining = (until) => {
  const diff = new Date(until) - new Date();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const res = await login({ email, password });
      const data = res.data;
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId || data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        avatarUrl: data.avatarUrl,
      });
      wsService.connect(data.accessToken);
      toast.success('Đăng nhập thành công!');
      navigate(data.role === 'ADMIN' ? '/admin' : '/chat');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'ACCOUNT_BANNED') {
        setBanInfo(err.response.data);
      } else {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Email hoặc mật khẩu không đúng';
        toast.error(msg);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              <rect width="40" height="40" rx="10" fill="#0068ff" />
              <text x="20" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">Z</text>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Zalo Clone</h1>
          <p className="text-blue-100 mt-1 text-sm">Đăng nhập để tiếp tục</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {banInfo ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">🔒</div>
              <h2 className="text-xl font-bold text-red-600">Tài khoản bị khóa</h2>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-800">Lý do: </span>
                  {banInfo.banReason || 'Vi phạm điều khoản sử dụng'}
                </p>
                {banInfo.banUntil ? (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-gray-800">Đến ngày: </span>
                    {new Date(banInfo.banUntil).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    <span className="ml-1 text-red-500 font-medium">({daysRemaining(banInfo.banUntil)} ngày còn lại)</span>
                  </p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">Khóa vĩnh viễn</p>
                )}
                {banInfo.bannedAt && (
                  <p className="text-xs text-gray-400">
                    Bị khóa lúc: {new Date(banInfo.bannedAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400">Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản trị viên.</p>
              <button
                onClick={() => setBanInfo(null)}
                className="text-sm text-blue-600 hover:underline"
              >
                Thử tài khoản khác
              </button>
            </div>
          ) : (
          <>
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0068ff] hover:bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Đăng ký ngay
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
