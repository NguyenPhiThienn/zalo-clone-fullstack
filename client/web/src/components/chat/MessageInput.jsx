import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Image, Smile, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({
  onSendText,
  onSendMedia,
  onTyping,
  onInputChange,
  placeholder = 'Nhập tin nhắn...',
  disabled = false,
  externalValue,
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]);      // { type, url, name }[]
  const typingTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  }, [onTyping]);

  // Nhận giá trị từ bên ngoài (ví dụ: SmartReply chọn suggestion)
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== null) {
      setText(externalValue);
      inputRef.current?.focus();
    }
  }, [externalValue]);

  const handleChange = (e) => {
    setText(e.target.value);
    handleTyping();
    if (onInputChange) onInputChange(e.target.value);
  };

  const handleSend = () => {
    if (mediaFiles.length) {
      onSendMedia && onSendMedia(mediaFiles);
      setMediaFiles([]);
      setPreviews([]);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText && onSendText(trimmed);
    setText('');
    if (onInputChange) onInputChange('');
    if (onTyping) {
      clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // Chọn nhiều ảnh cùng lúc
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setMediaFiles(files);
    setPreviews(files.map((f) => ({ type: 'image', url: URL.createObjectURL(f), name: f.name })));
    e.target.value = '';
  };

  // Chọn 1 file (video, pdf, ...)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFiles([file]);
    if (file.type.startsWith('video/')) {
      setPreviews([{ type: 'video', url: URL.createObjectURL(file), name: file.name }]);
    } else {
      setPreviews([{ type: 'file', name: file.name }]);
    }
    e.target.value = '';
  };

  const removePreview = (index) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    // revoke object URL to avoid memory leak
    if (previews[index]?.url) URL.revokeObjectURL(previews[index].url);
    setMediaFiles(newFiles);
    setPreviews(newPreviews);
  };

  const clearAll = () => {
    previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
    setMediaFiles([]);
    setPreviews([]);
  };

  const hasMedia = mediaFiles.length > 0;
  const isMultiImage = previews.length > 1 && previews[0]?.type === 'image';

  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      {/* Media preview */}
      {hasMedia && (
        <div className="mb-3 bg-gray-50 rounded-xl p-3">
          {isMultiImage ? (
            // Grid preview cho nhiều ảnh
            <div className="flex items-start gap-2 flex-wrap">
              {previews.slice(0, 8).map((p, i) => (
                <div key={i} className="relative group/thumb">
                  <img
                    src={p.url}
                    alt={p.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePreview(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full text-xs items-center justify-center hidden group-hover/thumb:flex"
                  >
                    ×
                  </button>
                </div>
              ))}
              {previews.length > 8 && (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-600 font-medium">
                  +{previews.length - 8}
                </div>
              )}
              <button onClick={clearAll} className="ml-auto p-1 hover:bg-gray-200 rounded-full self-start">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ) : (
            // Preview đơn (1 ảnh, video, file)
            <div className="flex items-start gap-3">
              {previews[0]?.type === 'image' && (
                <img src={previews[0].url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
              )}
              {previews[0]?.type === 'video' && (
                <video src={previews[0].url} className="w-16 h-16 object-cover rounded-lg" />
              )}
              {previews[0]?.type === 'file' && (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Paperclip size={20} className="text-blue-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{previews[0]?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {previews[0]?.type === 'image' ? 'Hình ảnh' : previews[0]?.type === 'video' ? 'Video' : 'Tệp'}
                </p>
              </div>
              <button onClick={clearAll} className="p-1 hover:bg-gray-200 rounded-full">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            disabled={disabled}
          >
            <Smile size={20} className="text-gray-500" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-11 left-0 z-30">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={300}
                height={380}
                searchPlaceHolder="Tìm emoji..."
              />
            </div>
          )}
        </div>

        {/* Image multi-select */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          disabled={disabled}
          title="Gửi ảnh"
        >
          <Image size={20} className="text-gray-500" />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
        />

        {/* File single-select */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          disabled={disabled}
          title="Đính kèm tệp"
        >
          <Paperclip size={20} className="text-gray-500" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={hasMedia ? 'Nhấn gửi để gửi tệp...' : placeholder}
            disabled={disabled || hasMedia}
            rows={1}
            className="w-full resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 max-h-32 overflow-y-auto"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !hasMedia)}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
            text.trim() || hasMedia
              ? 'bg-[#0068ff] text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
