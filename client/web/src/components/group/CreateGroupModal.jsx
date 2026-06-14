import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { getContacts } from '../../api/friendRequest';
import { createGroup } from '../../api/group';
import useChatStore from '../../store/chatStore';
import toast from 'react-hot-toast';

export default function CreateGroupModal({ isOpen, onClose }) {
  const { setGroups, groups } = useChatStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getContacts().then((res) => setUsers(res.data || [])).catch(() => {});
      setStep(1);
      setName('');
      setDescription('');
      setSelected([]);
      setSearch('');
    }
  }, [isOpen]);

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (user) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên nhóm'); return; }
    if (selected.length < 2) { toast.error('Chọn ít nhất 2 thành viên'); return; }

    setLoading(true);
    try {
      const res = await createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds: selected.map((u) => u.id),
      });
      setGroups([res.data, ...groups]);
      toast.success('Tạo nhóm thành công!');
      onClose();
    } catch {
      toast.error('Không thể tạo nhóm');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo nhóm mới" size="md">
      <div className="p-6">
        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên nhóm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả nhóm..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full bg-[#0068ff] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Tiếp theo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Chọn thành viên ({selected.length} đã chọn)
              </p>

              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selected.map((u) => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs rounded-full px-3 py-1"
                    >
                      {u.firstName} {u.lastName}
                      <button onClick={() => toggleSelect(u)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {filtered.map((user) => {
                  const isSelected = !!selected.find((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleSelect(user)}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Avatar
                        src={user.avatarUrl}
                        name={`${user.firstName} ${user.lastName}`}
                        size={36}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#0068ff] flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || selected.length < 2}
                className="flex-1 bg-[#0068ff] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang tạo...' : 'Tạo nhóm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
