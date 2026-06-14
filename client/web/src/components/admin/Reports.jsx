import { useEffect, useState, useCallback } from 'react';
import { Flag, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader, MessageCircle, ShieldOff, Image, FileText, Video, ExternalLink } from 'lucide-react';
import { getReports, resolveReport } from '../../api/report';
import { unbanUser } from '../../api/admin';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/** Mini component hiển thị danh sách bằng chứng của một báo cáo */
function EvidenceList({ urls }) {
  const [preview, setPreview] = useState(null);
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-2">
      <p className="text-[10px] text-gray-400 font-medium mb-1.5">📎 Bằng chứng ({urls.length} file):</p>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, i) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);

          if (isImage) {
            return (
              <button
                key={i}
                onClick={() => setPreview(url)}
                className="relative group"
                title="Xem ảnh"
              >
                <img
                  src={url}
                  alt={`evidence-${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                  <ExternalLink size={12} className="text-white opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            );
          }

          if (isVideo) {
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <Video size={12} />
                Video {i + 1}
              </a>
            );
          }

          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FileText size={12} />
              Tệp {i + 1}
            </a>
          );
        })}
      </div>

      {/* Image preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="preview"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

const STATUS_TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'PENDING', label: 'Đang chờ' },
  { id: 'RESOLVED', label: 'Đã xử lý' },
  { id: 'DISMISSED', label: 'Đã bỏ qua' },
];

const STATUS_BADGE = {
  PENDING:   { label: 'Đang chờ',   cls: 'bg-yellow-100 text-yellow-700' },
  RESOLVED:  { label: 'Đã xử lý',  cls: 'bg-green-100 text-green-700' },
  DISMISSED: { label: 'Đã bỏ qua', cls: 'bg-gray-100 text-gray-500' },
};

function formatTime(d) {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi }); }
  catch { return ''; }
}

export default function Reports({ onChatUser }) {
  const [reports, setReports]       = useState([]);
  const [status, setStatus]         = useState('PENDING');
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [resolving, setResolving]   = useState(null); // report id being resolved
  const [resolution, setResolution] = useState('');   // text input per report
  const [banAction, setBanAction]   = useState('NONE'); // per-report ban action
  const [unbanning, setUnbanning]   = useState(null); // report id being unbanned

  const fetchReports = useCallback((s = status, p = page) => {
    setLoading(true);
    getReports(s || undefined, p)
      .then((res) => {
        const data = res.data;
        setReports(Array.isArray(data) ? data : (data.content || []));
        setTotalPages(Array.isArray(data) ? 1 : (data.totalPages || 1));
      })
      .catch(() => toast.error('Không thể tải danh sách báo cáo'))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { fetchReports(status, page); }, [status, page]);

  const handleTabChange = (s) => {
    setStatus(s);
    setPage(0);
  };

  const handleResolve = async (reportId, newStatus) => {
    setResolving(reportId + '_' + newStatus);
    try {
      const action = newStatus === 'DISMISSED' ? 'NONE' : banAction;
      await resolveReport(reportId, { status: newStatus, resolution, banAction: action });
      const banMsg = action !== 'NONE' ? ` + đã khóa tài khoản` : '';
      toast.success(newStatus === 'RESOLVED' ? `Đã xử lý báo cáo${banMsg}` : 'Đã bỏ qua báo cáo');
      setResolution('');
      setBanAction('NONE');
      fetchReports(status, page);
    } catch { toast.error('Thao tác thất bại'); }
    finally { setResolving(null); }
  };

  const handleUnban = async (reportId, userId) => {
    setUnbanning(reportId);
    try {
      await unbanUser(userId);
      toast.success('Đã bỏ ban người dùng');
      fetchReports(status, page);
    } catch { toast.error('Không thể bỏ ban'); }
    finally { setUnbanning(null); }
  };

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              status === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={24} className="animate-spin text-blue-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Flag size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Không có báo cáo nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {reports.map((report) => {
              const badge = STATUS_BADGE[report.status] || STATUS_BADGE.PENDING;
              return (
                <div key={report.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Reported user */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Người tố cáo:</span>
                        <span className="text-xs font-medium text-gray-700">{report.reporterName}</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-xs text-gray-400">Bị tố cáo:</span>
                        <span className="text-sm font-semibold text-gray-800">{report.reportedName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-start gap-2">
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {report.reason}
                        </span>
                        {report.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{report.description}</p>
                        )}
                      </div>

                      {/* Bằng chứng */}
                      <EvidenceList urls={report.evidenceUrls} />

                      {report.resolution && (
                        <p className="text-xs text-gray-400 mt-1 italic">Xử lý: {report.resolution}</p>
                      )}

                      {/* Bỏ ban — chỉ cho RESOLVED mà user đang bị ban */}
                      {report.status === 'RESOLVED' && report.reportedBanned && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleUnban(report.id, report.reportedId)}
                            disabled={unbanning === report.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {unbanning === report.id
                              ? <Loader size={11} className="animate-spin" />
                              : <ShieldOff size={11} />}
                            Bỏ ban người bị tố cáo
                          </button>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(report.createdAt)}</p>

                      {/* Resolve actions — only for PENDING */}
                      {report.status === 'PENDING' && (
                        <div className="mt-3 space-y-2">
                          {/* Row 1: ghi chú + hành động phạt */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              placeholder="Ghi chú xử lý (tuỳ chọn)"
                              value={resolving?.startsWith(String(report.id)) ? resolution : ''}
                              onChange={(e) => setResolution(e.target.value)}
                              onFocus={() => setResolution('')}
                              className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <select
                              value={banAction}
                              onChange={(e) => setBanAction(e.target.value)}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-gray-700"
                            >
                              <option value="NONE">Không phạt</option>
                              <option value="BAN_1_DAY">Khóa 1 ngày</option>
                              <option value="BAN_7_DAYS">Khóa 7 ngày</option>
                              <option value="BAN_30_DAYS">Khóa 30 ngày</option>
                              <option value="BAN_PERMANENT">Khóa vĩnh viễn</option>
                            </select>
                          </div>
                          {/* Row 2: nút hành động */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleResolve(report.id, 'RESOLVED')}
                              disabled={!!resolving}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                banAction !== 'NONE'
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              {resolving === report.id + '_RESOLVED'
                                ? <Loader size={11} className="animate-spin" />
                                : <CheckCircle size={12} />}
                              {banAction !== 'NONE' ? 'Xử lý + Khóa' : 'Xử lý'}
                            </button>
                            <button
                              onClick={() => handleResolve(report.id, 'DISMISSED')}
                              disabled={!!resolving}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                              {resolving === report.id + '_DISMISSED'
                                ? <Loader size={11} className="animate-spin" />
                                : <XCircle size={12} />}
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat with reported user */}
                    {onChatUser && report.status === 'PENDING' && (
                      <button
                        onClick={() => onChatUser(report.reportedId)}
                        title={`Nhắn tin với ${report.reportedName}`}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-400 transition-colors"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40"
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
