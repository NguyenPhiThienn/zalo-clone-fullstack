import api from './axios';

export const sendMessage = (data) =>
  api.post('/api/v1/message', data);

export const uploadMedia = (chatId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/v1/message/upload-media/${chatId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getMessages = (chatId, page = 0, size = 30) =>
  api.get(`/api/v1/message/chat/${chatId}`, { params: { page, size } });

export const markSeen = (chatId) =>
  api.patch(`/api/v1/message/seen/${chatId}`);

export const markDelivered = (chatId) =>
  api.patch(`/api/v1/message/delivered/${chatId}`);

export const markAllDelivered = () =>
  api.patch('/api/v1/message/delivered/all');

export const recallMessage = (messageId) =>
  api.delete(`/api/v1/message/${messageId}/recall`);

export const deleteMessageForMe = (messageId) =>
  api.delete(`/api/v1/message/${messageId}`);

export const getMediaUrl = (filename) =>
  `${import.meta.env.VITE_API_URL || ''}/api/v1/message/media/${filename}`;

export const toggleReaction = (messageId, emoji) =>
  api.post(`/api/v1/message/${messageId}/reactions`, null, { params: { emoji } });

export const deleteReaction = (messageId) =>
  api.delete(`/api/v1/message/${messageId}/reactions`);

export const getReactions = (messageId) =>
  api.get(`/api/v1/message/${messageId}/reactions`);
