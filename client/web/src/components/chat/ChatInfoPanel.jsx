import React from 'react';
import { X, Mail, Clock, User } from 'lucide-react';
import Avatar from '../common/Avatar';
import useChatStore from '../../store/chatStore';

export default function ChatInfoPanel({ chatDetail, onClose }) {
  const { setViewingProfileId } = useChatStore();
  if (!chatDetail) return null;

  return (
    <div className="w-72 flex-shrink-0 h-full bg-white border-l border-gray-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">Thông tin hội thoại</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center py-6 px-4 border-b border-gray-100">
        <div
          onClick={() => chatDetail.recipientId && setViewingProfileId(chatDetail.recipientId)}
          className="cursor-pointer"
        >
          <Avatar
            src={chatDetail.avatarUrl}
            name={chatDetail.chatName}
            size={72}
            online={chatDetail.recipientOnline}
          />
        </div>
        <h4 className="mt-3 font-bold text-gray-800 text-base text-center">
          {chatDetail.chatName || 'Người dùng'}
        </h4>
        <span className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          chatDetail.recipientOnline
            ? 'bg-green-50 text-green-600'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {chatDetail.recipientOnline ? 'Đang hoạt động' : chatDetail.recipientLastSeenText || 'Không hoạt động'}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {chatDetail.recipientEmail && (
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail size={14} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Email</p>
              <p className="text-sm text-gray-700 font-medium truncate">{chatDetail.recipientEmail}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock size={14} className="text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Trạng thái</p>
            <p className="text-sm text-gray-700 font-medium">
              {chatDetail.recipientOnline ? 'Đang hoạt động' : chatDetail.recipientLastSeenText || 'Không xác định'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Tên hiển thị</p>
            <p className="text-sm text-gray-700 font-medium">{chatDetail.chatName || 'Người dùng'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
