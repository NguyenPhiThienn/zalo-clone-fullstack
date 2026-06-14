import api from './axios';

export const sendAiMessage = (message) =>
  api.post('/api/v1/ai/chat', { message });

export const getAiHistory = (page = 0, size = 30) =>
  api.get('/api/v1/ai/history', { params: { page, size } });

export const deleteAiHistory = () =>
  api.delete('/api/v1/ai/history');
