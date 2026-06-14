import React from 'react';

export default function TypingIndicator({ name }) {
  return (
    <div className="flex items-end gap-2 px-4 py-1">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
          <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
        </div>
      </div>
      {name && (
        <span className="text-xs text-gray-400 mb-1">{name} đang nhập...</span>
      )}
    </div>
  );
}
