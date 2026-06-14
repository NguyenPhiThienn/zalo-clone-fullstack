import React, { useState, useEffect } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function getColorFromName(name) {
  if (!name) return '#0068ff';
  const colors = [
    '#0068ff', '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688',
    '#4caf50', '#8bc34a', '#cddc39', '#ff9800', '#ff5722',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 40, className = '', online = null }) {
  const baseAvatarUrl = src ? (src.startsWith('http') ? src : `${BASE_URL}/api/v1/message/media/${src}`) : null;
  const [imgError, setImgError] = useState(false);
  const [urlVersion, setUrlVersion] = useState(0);

  // Reset error state and add version number whenever src changes
  useEffect(() => {
    setImgError(false);
    setUrlVersion(prev => prev + 1);
  }, [src]);

  const avatarUrl = baseAvatarUrl ? `${baseAvatarUrl}?v=${urlVersion}` : null;
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  const fontSize = size * 0.38;
  const showImage = avatarUrl && !imgError;

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-medium"
          style={{ backgroundColor: bgColor, fontSize }}
        >
          {initials}
        </div>
      )}
      {online !== null && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
