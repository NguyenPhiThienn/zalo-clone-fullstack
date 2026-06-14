import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, verifyEmail, resendVerification } from '../api/auth';
import useAuthStore from '../store/authStore';
import wsService from '../services/websocket';
import toast from 'react-hot-toast';

const Logo = () => (
  <div className="text-center mb-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <rect width="40" height="40" rx="10" fill="#0068ff" />
        <text x="20" y="27" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">Z</text>
      </svg>
    </div>
    <h1 className="text-3xl font-bold text-white">Zalo Clone</h1>
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password, confirmPassword } = form;
    if (!firstName || !lastName || !email || !password) {
      toast.error('Vui lòng điền đầy đủ thông tin'); return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu không khớp'); return;
    }
    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      toast.success('Mã xác thực đã được gửi đến email của bạn');
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      toast.error('Vui lòng nhập đủ 6 chữ số'); return;
    }
    setLoading(true);
    try {
      const res = await verifyEmail({ email: form.email, code });
      const data = res.data;
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        avatarUrl: data.avatarUrl,
      });
      wsService.connect(data.accessToken);
      toast.success('Tài khoản đã được xác thực!');
      navigate('/chat');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerification({ email: form.email });
      toast.success('Đã gửi lại mã xác thực');
      startResendCooldown();
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi lại mã');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Logo />

        {step === 'form' ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Đăng ký</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ</label>
                  <input type="text" name="firstName" value={form.firstName} onChange={handleChange}
                    placeholder="Họ" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên</label>
                  <input type="text" name="lastName" value={form.lastName} onChange={handleChange}
                    placeholder="Tên" required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="Nhập địa chỉ email" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
                <input type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="Tối thiểu 6 ký tự" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                  placeholder="Nhập lại mật khẩu" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0068ff] hover:bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý...
                  </span>
                ) : 'Tạo tài khoản'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">Đăng nhập</Link>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Xác thực email</h2>
              <p className="text-sm text-gray-500 mt-1">
                Mã OTP đã được gửi đến<br />
                <span className="font-medium text-gray-700">{form.email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify}>
              <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                ))}
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-[#0068ff] hover:bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xác thực...
                  </span>
                ) : 'Xác thực'}
              </button>
            </form>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                Không nhận được mã?{' '}
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-blue-600 font-medium hover:underline disabled:text-gray-400 disabled:no-underline">
                  {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại'}
                </button>
              </p>
              <button onClick={() => setStep('form')} className="text-sm text-gray-400 hover:text-gray-600 mt-2">
                Quay lại đăng ký
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
