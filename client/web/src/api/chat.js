import api from './axios';

export const getMyChats = () =>
  api.get('/api/v1/chat');

export const getChatDetail = (chatId) =>
  api.get(`/api/v1/chat/${chatId}`);

export const startChat = (otherUserId) =>
  api.post(`/api/v1/chat/start/${otherUserId}`);

export const deleteChat = (chatId) =>
  api.delete(`/api/v1/chat/${chatId}`);
