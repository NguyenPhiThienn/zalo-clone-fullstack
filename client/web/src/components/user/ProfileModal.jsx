import React, { useState, useEffect } from 'react';
import { Camera, Key, User } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { getMyProfile, updateMyProfile, changePassword, uploadAvatar } from '../../api/user';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ProfileModal({ isOpen, onClose }) {
  const { auth, updateAuth } = useAuthStore();
  const [tab, setTab] = useState('info');
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab('info');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      getMyProfile()
        .then((res) => {
          setProfile(res.data);
          setFirstName(res.data.firstName || '');
          setLastName(res.data.lastName || '');
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const res = await updateMyProfile({ firstName, lastName });
      setProfile(res.data);
      updateAuth({ firstName, lastName });
      toast.success('Đã cập nhật thông tin');
    } catch {
      toast.error('Không thể cập nhật thông tin');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Đã đổi mật khẩu thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng');
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const res = await uploadAvatar(file);
      const newAvatarUrl = res.data.avatarUrl;
      setProfile((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      updateAuth({ avatarUrl: newAvatarUrl });
      toast.success('Đã cập nhật ảnh đại diện');
    } catch {
      toast.error('Không thể cập nhật ảnh đại diện');
    }
    setUploadLoading(false);
    e.target.value = '';
  };

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thông tin cá nhân" size="md">
      <div className="p-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar
              src={profile?.avatarUrl}
              name={fullName || profile?.email}
              size={80}
              online={true}
            />
            <label className={`absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors ${uploadLoading ? 'opacity-50' : ''}`}>
              <Camera size={14} className="text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadLoading}
              />
            </label>
          </div>
          <h3 className="mt-3 font-bold text-gray-800 text-lg">{fullName || 'Người dùng'}</h3>
          <p className="text-sm text-gray-400">{profile?.email}</p>
          {profile?.role === 'ROLE_ADMIN' && (
            <span className="mt-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              Quản trị viên
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-5">
          <button
            onClick={() => setTab('info')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <User size={15} />
            Thông tin
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'password'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Key size={15} />
            Đổi mật khẩu
          </button>
        </div>

        {tab === 'info' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Họ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Tên"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={profile?.email || ''}
                disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full bg-[#0068ff] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full bg-[#0068ff] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
