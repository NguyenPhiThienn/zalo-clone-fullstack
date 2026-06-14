import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { getAuditLogs } from '../../api/admin';

const ACTION_LABELS = {
  BAN_USER: { label: 'Khóa tài khoản', color: 'bg-red-100 text-red-600' },
  UNBAN_USER: { label: 'Mở khóa tài khoản', color: 'bg-green-100 text-green-600' },
  DELETE_USER: { label: 'Xóa người dùng', color: 'bg-red-100 text-red-700' },
  PROMOTE: { label: 'Thăng cấp Admin', color: 'bg-blue-100 text-blue-600' },
  DEMOTE: { label: 'Hạ cấp User', color: 'bg-gray-100 text-gray-600' },
  DELETE_GROUP: { label: 'Xóa nhóm', color: 'bg-orange-100 text-orange-600' },
  CREATE_ADMIN: { label: 'Tạo Admin', color: 'bg-purple-100 text-purple-600' },
  RESET_PASSWORD: { label: 'Reset mật khẩu', color: 'bg-yellow-100 text-yellow-700' },
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchLogs = (p = 0) => {
    setLoading(true);
    getAuditLogs(p, 20)
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setLogs(data);
          setTotalPages(1);
        } else {
          setLogs(data.content || []);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList size={18} className="text-gray-500" />
        <h3 className="font-semibold text-gray-700">Nhật ký hoạt động Admin</h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Chưa có hoạt động nào</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const action = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-500' };
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${action.color}`}>
                        {action.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{log.adminEmail}</span>
                        {log.targetName && (
                          <> → <span className="text-gray-600">{log.targetName}</span></>
                        )}
                      </p>
                      {log.details && (
                        <p className="text-xs text-gray-400 mt-0.5">{log.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

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
