import React, { useEffect, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getAdminGroups, deleteAdminGroup } from '../../api/admin';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function GroupManagement() {
  const [groups, setGroups] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchGroups = (p = 0) => {
    setLoading(true);
    getAdminGroups(p, 20)
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setGroups(data);
          setTotalPages(1);
        } else {
          setGroups(data.content || []);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGroups(page); }, [page]);

  const handleDelete = async (groupId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa nhóm này?')) return;
    try {
      await deleteAdminGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      toast.success('Đã xóa nhóm');
    } catch {
      toast.error('Không thể xóa nhóm');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Quản lý nhóm</h3>
        <span className="text-sm text-gray-400">{groups.length} nhóm</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {groups.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">Không có nhóm nào</div>
            )}
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <Avatar src={group.avatarUrl} name={group.name} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-gray-400 truncate">{group.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{group.memberCount} thành viên</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(group.id)}
                  title="Xóa nhóm"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-100 text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
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
