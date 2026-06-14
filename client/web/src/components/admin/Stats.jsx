import React, { useEffect, useState } from 'react';
import { Users, MessageCircle, Wifi, Ban, TrendingUp, UserCheck, MessagesSquare, LayoutList } from 'lucide-react';
import { getStats } from '../../api/admin';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon size={22} className={color} />
        </div>
      </div>
    </div>
  );
}

function MiniChart({ data, color = 'bg-blue-500', label }) {
  if (!data || data.length === 0) return null;
  const last14 = data.slice(-14);
  const maxCount = Math.max(...last14.map((d) => d.count || 0), 1);
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={18} className="text-blue-500" />
        <h3 className="font-semibold text-gray-700">{label}</h3>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {last14.map((item, i) => {
          const height = ((item.count || 0) / maxCount) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {item.count > 0 && <span className="text-[9px] text-gray-400">{item.count}</span>}
              <div
                className={`w-full ${color} rounded-t-sm transition-all`}
                style={{ height: `${Math.max(height, 3)}%` }}
              />
              <span className="text-[9px] text-gray-400 truncate w-full text-center">
                {item.date ? new Date(item.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Tổng người dùng" value={stats?.totalUsers} color="text-blue-600" />
        <StatCard icon={UserCheck} label="Đã xác thực email" value={stats?.verifiedUsers} color="text-emerald-600" />
        <StatCard icon={MessagesSquare} label="Tổng tin nhắn" value={stats?.totalMessages} color="text-green-600" />
        <StatCard icon={LayoutList} label="Tổng nhóm" value={stats?.totalGroups} color="text-purple-600" />
        <StatCard icon={MessageCircle} label="Cuộc trò chuyện" value={stats?.totalChats} color="text-indigo-600" />
        <StatCard icon={Wifi} label="Đang trực tuyến" value={stats?.onlineUsers} color="text-teal-600" />
        <StatCard icon={Ban} label="Tài khoản bị khóa" value={stats?.bannedUsers} color="text-red-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MiniChart data={stats?.dailyMessageCounts} color="bg-blue-500" label="Tin nhắn theo ngày (14 ngày)" />
        <MiniChart data={stats?.dailyNewUsers} color="bg-emerald-500" label="Người dùng mới (14 ngày)" />
        <MiniChart data={stats?.dailyNewGroups} color="bg-purple-500" label="Nhóm mới (14 ngày)" />
      </div>

      {/* Top active users */}
      {stats?.topActiveUsers && stats.topActiveUsers.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Top người dùng hoạt động nhất</h3>
          <div className="space-y-2">
            {stats.topActiveUsers.map((user, i) => (
              <div key={user.userId || i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={`text-sm font-bold w-6 text-center ${i < 3 ? 'text-blue-500' : 'text-gray-400'}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{user.fullName}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {user.messageCount} tin nhắn
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
