import api from './axios';

export const sendFriendRequest = (receiverId) =>
  api.post(`/api/v1/friend-request/send/${receiverId}`);

export const acceptFriendRequest = (requestId) =>
  api.post(`/api/v1/friend-request/${requestId}/accept`);

export const rejectFriendRequest = (requestId) =>
  api.post(`/api/v1/friend-request/${requestId}/reject`);

export const getPendingRequests = () =>
  api.get('/api/v1/friend-request/pending');

export const getSentRequests = () =>
  api.get('/api/v1/friend-request/sent');

export const getContacts = () =>
  api.get('/api/v1/friend-request/contacts');

export const unfriend = (friendId) =>
  api.delete(`/api/v1/friend-request/unfriend/${friendId}`);
