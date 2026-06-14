import { useState, useRef } from 'react';
import { Flag, X, Upload, Loader2, Image, FileText, Video, AlertCircle } from 'lucide-react';
import { createReport, uploadReportEvidence } from '../../api/report';
import toast from 'react-hot-toast';

const REASONS = [
  'Spam',
  'Quấy rối',
  'Nội dung không phù hợp',
  'Tài khoản giả mạo',
  'Khác',
];

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

function getFileIcon(file) {
  if (file.type.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
  if (file.type.startsWith('video/')) return <Video size={14} className="text-purple-500" />;
  return <FileText size={14} className="text-gray-500" />;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportModal({ userId, userName, onClose }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Evidence state
  const [evidenceFiles, setEvidenceFiles] = useState([]); // { file, preview, key, url, status }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    const id = crypto.randomUUID();
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    setEvidenceFiles((prev) => [
      ...prev,
      { id, file, preview, key: null, url: null, status: 'uploading', name: file.name, size: file.size, type: file.type },
    ]);

    try {
      const res = await uploadReportEvidence(file);
      const { key, url } = res.data;
      setEvidenceFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, key, url, status: 'done' } : f))
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Upload thất bại';
      setEvidenceFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'error', errorMsg: msg } : f))
      );
    }
  };

  const handleFiles = (files) => {
    const current = evidenceFiles.length;
    const remaining = MAX_FILES - current;
    if (remaining <= 0) {
      toast.error(`Tối đa ${MAX_FILES} file bằng chứng`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    for (const f of toUpload) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} vượt quá ${MAX_SIZE_MB}MB`);
        continue;
      }
      uploadFile(f);
    }
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setEvidenceFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;

    // Kiểm tra còn file đang upload không
    const uploading = evidenceFiles.filter((f) => f.status === 'uploading');
    if (uploading.length > 0) {
      toast.error('Vui lòng chờ upload bằng chứng hoàn tất');
      return;
    }

    const evidenceKeys = evidenceFiles
      .filter((f) => f.status === 'done' && f.key)
      .map((f) => f.key);

    setLoading(true);
    try {
      await createReport(userId, {
        reason,
        description: description.trim() || undefined,
        evidenceKeys,
      });
      toast.success('Đã gửi tố cáo. Chúng tôi sẽ xem xét sớm nhất.');
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể gửi tố cáo';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const hasUploading = evidenceFiles.some((f) => f.status === 'uploading');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Flag size={15} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tố cáo người dùng</p>
              {userName && <p className="text-xs text-gray-400">{userName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Reasons */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Lý do tố cáo <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Mô tả thêm <span className="text-gray-400">(tuỳ chọn)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp thêm thông tin chi tiết..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{description.length}/500</p>
          </div>

          {/* Evidence upload */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Bằng chứng <span className="text-gray-400">(ảnh, video, tệp — tối đa {MAX_FILES} file)</span>
            </label>

            {/* Drop zone */}
            {evidenceFiles.length < MAX_FILES && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
                <p className="text-xs text-gray-500">
                  Kéo thả hoặc <span className="text-orange-500 font-medium">chọn file</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Ảnh, video, tài liệu • Tối đa {MAX_SIZE_MB}MB/file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}

            {/* File list */}
            {evidenceFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {evidenceFiles.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                      f.status === 'error'
                        ? 'border-red-200 bg-red-50'
                        : f.status === 'done'
                        ? 'border-green-100 bg-green-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Preview/icon */}
                    {f.preview ? (
                      <img src={f.preview} alt="" className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-100 flex-shrink-0">
                        {getFileIcon(f)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-700">{f.name}</p>
                      <p className="text-gray-400">{formatSize(f.size)}</p>
                      {f.status === 'error' && (
                        <p className="text-red-500 flex items-center gap-1">
                          <AlertCircle size={10} /> {f.errorMsg}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {f.status === 'uploading' && (
                        <Loader2 size={14} className="animate-spin text-orange-400" />
                      )}
                      {f.status === 'done' && (
                        <span className="text-green-600 font-semibold">✓</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!reason || loading || hasUploading}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Đang gửi...</>
              ) : hasUploading ? (
                <><Loader2 size={14} className="animate-spin" /> Đang upload...</>
              ) : (
                'Gửi tố cáo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
