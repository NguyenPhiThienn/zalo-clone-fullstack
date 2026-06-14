import React, { useEffect, useState } from 'react';
import {
  Ban, CheckCircle, Trash2, ShieldCheck, ShieldOff,
  ChevronLeft, ChevronRight, Search, KeyRound, UserPlus, X, Loader, MessageCircle,
} from 'lucide-react';
import {
  getAdminUsers, banUser, unbanUser, deleteUser,
  promoteUser, demoteUser, resetPassword, createAdminAccount,
} from '../../api/admin';
import Avatar from '../common/Avatar';
import BanModal from './BanModal';
import toast from 'react-hot-toast';

function CreateAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.firstName) return;
    setLoading(true);
    try {
      const res = await createAdminAccount(form);
      toast.success(`Đã tạo admin: ${res.data.email}`);
      onCreated(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">Tạo tài khoản Admin</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Họ *</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Nguyễn"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tên</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Văn A"
            />
          </div>
          <p className="text-xs text-gray-400">Mật khẩu mặc định: <span className="font-mono font-medium">Admin@1234</span></p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-[#0068ff] text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Tạo tài khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement({ onChatUser }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [banTarget, setBanTarget] = useState(null); // user object to ban

  const fetchUsers = (p = 0) => {
    setLoading(true);
    getAdminUsers(p, 20)
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setUsers(data);
          setTotalPages(1);
          setTotalElements(data.length);
        } else {
          setUsers(data.content || []);
          setTotalPages(data.totalPages || 1);
          setTotalElements(data.totalElements || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(page); }, [page]);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleUnban = async (userId) => {
    setActionLoading(userId + '_ban');
    try {
      await unbanUser(userId);
      setUsers((prev) => prev.map((u) => u.id === userId
        ? { ...u, banned: false, banReason: null, banUntil: null } : u));
      toast.success('Đã mở khóa tài khoản');
    } catch { toast.error('Thao tác thất bại'); }
    finally { setActionLoading(null); }
  };

  const handleBanConfirm = async (reason, durationDays) => {
    if (!banTarget) return;
    setActionLoading(banTarget.id + '_ban');
    try {
      const res = await banUser(banTarget.id, { reason, durationDays });
      setUsers((prev) => prev.map((u) => u.id === banTarget.id ? { ...u, ...res.data } : u));
      toast.success('Đã khóa tài khoản');
      setBanTarget(null);
    } catch { toast.error('Thao tác thất bại'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa người dùng này?')) return;
    setActionLoading(userId + '_del');
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('Đã xóa người dùng');
    } catch { toast.error('Không thể xóa người dùng'); }
    finally { setActionLoading(null); }
  };

  const handlePromote = async (userId, isAdmin) => {
    setActionLoading(userId + '_role');
    try {
      if (isAdmin) {
        await demoteUser(userId);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'USER' } : u));
        toast.success('Đã hạ cấp người dùng');
      } else {
        await promoteUser(userId);
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: 'ADMIN' } : u));
        toast.success('Đã thăng cấp Admin');
      }
    } catch { toast.error('Thao tác thất bại'); }
    finally { setActionLoading(null); }
  };

  const handleResetPassword = async (userId, email) => {
    if (!window.confirm(`Reset mật khẩu của ${email} về "Reset@1234"?`)) return;
    setActionLoading(userId + '_pwd');
    try {
      await resetPassword(userId);
      toast.success('Đã reset mật khẩu về Reset@1234');
    } catch { toast.error('Không thể reset mật khẩu'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-4">
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newUser) => setUsers((prev) => [newUser, ...prev])}
        />
      )}
      {banTarget && (
        <BanModal
          user={banTarget}
          onConfirm={handleBanConfirm}
          onClose={() => setBanTarget(null)}
          loading={actionLoading === banTarget.id + '_ban'}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên, email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">{totalElements} người dùng</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0068ff] text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <UserPlus size={15} />
            Tạo Admin
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Người dùng</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Vai trò</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Trạng thái</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Email</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                      Không tìm thấy người dùng
                    </td>
                  </tr>
                )}
                {filtered.map((user) => {
                  const isAdmin = user.role === 'ADMIN';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={34} online={user.online} />
                          <span className="text-sm font-medium text-gray-800 whitespace-nowrap">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isAdmin ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={user.banned && user.banReason ? `Lý do: ${user.banReason}` : undefined}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-default ${
                            user.banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {user.banned ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.emailVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Chat */}
                          {onChatUser && (
                            <button
                              onClick={() => onChatUser(user.id)}
                              title="Nhắn tin với người dùng"
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-400 transition-colors"
                            >
                              <MessageCircle size={15} />
                            </button>
                          )}
                          {/* Ban/Unban */}
                          <button
                            onClick={() => user.banned ? handleUnban(user.id) : setBanTarget(user)}
                            disabled={actionLoading === user.id + '_ban'}
                            title={user.banned ? 'Mở khóa' : 'Khóa tài khoản'}
                            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                              user.banned ? 'hover:bg-green-100 text-green-500' : 'hover:bg-orange-100 text-orange-500'
                            }`}
                          >
                            {actionLoading === user.id + '_ban'
                              ? <Loader size={13} className="animate-spin" />
                              : user.banned ? <CheckCircle size={15} /> : <Ban size={15} />}
                          </button>
                          {/* Promote/Demote */}
                          <button
                            onClick={() => handlePromote(user.id, isAdmin)}
                            disabled={actionLoading === user.id + '_role'}
                            title={isAdmin ? 'Hạ cấp' : 'Thăng cấp Admin'}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-500 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === user.id + '_role'
                              ? <Loader size={13} className="animate-spin" />
                              : isAdmin ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                          </button>
                          {/* Reset password */}
                          <button
                            onClick={() => handleResetPassword(user.id, user.email)}
                            disabled={actionLoading === user.id + '_pwd'}
                            title="Reset mật khẩu"
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-yellow-100 text-yellow-500 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === user.id + '_pwd'
                              ? <Loader size={13} className="animate-spin" />
                              : <KeyRound size={15} />}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={actionLoading === user.id + '_del'}
                            title="Xóa người dùng"
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-red-400 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === user.id + '_del'
                              ? <Loader size={13} className="animate-spin" />
                              : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
