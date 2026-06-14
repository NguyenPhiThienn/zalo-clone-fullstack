import React, { useEffect, useState } from 'react';
import { X, Image, Film, FileText, Link2, Download, Loader2, ExternalLink } from 'lucide-react';
import { getGroupMedia } from '../../api/group';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const TABS = [
  { key: 'images', label: 'Ảnh',  Icon: Image },
  { key: 'videos', label: 'Video', Icon: Film },
  { key: 'files',  label: 'File',  Icon: FileText },
  { key: 'links',  label: 'Link',  Icon: Link2 },
];

export default function GroupMediaPanel({ groupId, onClose }) {
  const [tab, setTab]     = useState('images');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getGroupMedia(groupId)
      .then((r) => setData(r.data))
      .catch(() => setData({ images: [], videos: [], files: [], links: [] }))
      .finally(() => setLoading(false));
  }, [groupId]);

  const fmt = (date) =>
    date ? format(new Date(date), 'dd/MM/yyyy', { locale: vi }) : '';

  const items = data ? data[tab] ?? [] : [];

  return (
    <div className="flex flex-col w-72 border-l border-gray-200 bg-white h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Kho lưu trữ</span>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100">
          <X size={15} className="text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors
              ${tab === key
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={15} />
            {label}
            {data && (
              <span className={`text-[9px] ${tab === key ? 'text-blue-400' : 'text-gray-400'}`}>
                {data[key]?.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            {(() => { const { Icon } = TABS.find(t => t.key === tab); return <Icon size={28} className="mb-2 opacity-40" />; })()}
            <span className="text-xs">Chưa có {TABS.find(t => t.key === tab)?.label.toLowerCase()} nào</span>
          </div>
        ) : tab === 'images' ? (
          <ImageGrid items={items} />
        ) : tab === 'videos' ? (
          <VideoList items={items} fmt={fmt} />
        ) : tab === 'files' ? (
          <FileList items={items} fmt={fmt} />
        ) : (
          <LinkList items={items} fmt={fmt} />
        )}
      </div>
    </div>
  );
}

// ─── Image Grid ───────────────────────────────────────────────────────────────
function ImageGrid({ items }) {
  const [preview, setPreview] = useState(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 p-1">
        {items.map((img) => (
          <button
            key={img.id}
            onClick={() => setPreview(img.url)}
            className="aspect-square overflow-hidden rounded bg-gray-100 hover:opacity-90 transition-opacity"
          >
            <img
              src={img.url}
              alt={img.fileName || 'ảnh'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="preview" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreview(null)}>
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Video List ───────────────────────────────────────────────────────────────
function VideoList({ items, fmt }) {
  return (
    <div className="divide-y divide-gray-50">
      {items.map((v) => (
        <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Film size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{v.fileName || 'video'}</p>
            <p className="text-[10px] text-gray-400">{v.senderName} · {fmt(v.createdDate)}</p>
          </div>
          <a href={v.url} target="_blank" rel="noreferrer" download className="text-gray-400 hover:text-blue-500">
            <Download size={14} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── File List ────────────────────────────────────────────────────────────────
function FileList({ items, fmt }) {
  const ext = (name) => name?.split('.').pop()?.toUpperCase() ?? 'FILE';
  const color = (name) => {
    const e = name?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(e)) return 'bg-red-100 text-red-600';
    if (['doc', 'docx'].includes(e)) return 'bg-blue-100 text-blue-600';
    if (['xls', 'xlsx'].includes(e)) return 'bg-green-100 text-green-600';
    if (['zip', 'rar', '7z'].includes(e)) return 'bg-yellow-100 text-yellow-600';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(e)) return 'bg-purple-100 text-purple-600';
    return 'bg-gray-100 text-gray-600';
  };
  return (
    <div className="divide-y divide-gray-50">
      {items.map((f) => (
        <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${color(f.fileName)}`}>
            {ext(f.fileName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{f.fileName || 'file'}</p>
            <p className="text-[10px] text-gray-400">{f.senderName} · {fmt(f.createdDate)}</p>
          </div>
          <a href={f.url} target="_blank" rel="noreferrer" download={f.fileName} className="text-gray-400 hover:text-blue-500">
            <Download size={14} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Link List ────────────────────────────────────────────────────────────────
function LinkList({ items, fmt }) {
  const domain = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  };
  return (
    <div className="divide-y divide-gray-50 px-3">
      {items.map((l, i) => (
        <div key={i} className="py-2.5">
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Link2 size={13} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 font-medium truncate group-hover:underline">
                {domain(l.url)}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{l.url}</p>
              <p className="text-[10px] text-gray-400">{l.senderName} · {fmt(l.createdDate)}</p>
            </div>
            <ExternalLink size={12} className="text-gray-300 flex-shrink-0 mt-1" />
          </a>
        </div>
      ))}
    </div>
  );
}
