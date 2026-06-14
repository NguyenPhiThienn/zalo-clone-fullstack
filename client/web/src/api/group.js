import api from './axios';

export const createGroup = (data) =>
  api.post('/api/v1/group', data);

export const getMyGroups = () =>
  api.get('/api/v1/group');

export const getGroupDetail = (groupId) =>
  api.get(`/api/v1/group/${groupId}`);

export const updateGroup = (groupId, data) =>
  api.put(`/api/v1/group/${groupId}`, data);

export const uploadGroupAvatar = (groupId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/v1/group/${groupId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const addGroupMembers = (groupId, userIds) =>
  api.post(`/api/v1/group/${groupId}/members`, { userIds });

export const removeGroupMember = (groupId, userId) =>
  api.delete(`/api/v1/group/${groupId}/members/${userId}`);

export const leaveGroup = (groupId, newAdminId = null) =>
  api.delete(`/api/v1/group/${groupId}/leave`, { params: newAdminId ? { newAdminId } : {} });

export const setMemberAsAdmin = (groupId, userId) =>
  api.patch(`/api/v1/group/${groupId}/members/${userId}/set-admin`);

export const dissolveGroup = (groupId) =>
  api.delete(`/api/v1/group/${groupId}/dissolve`);

export const sendGroupMessage = (groupId, data) =>
  api.post(`/api/v1/group/${groupId}/messages`, data);

export const uploadGroupMedia = (groupId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/v1/group/${groupId}/upload-media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getGroupMessages = (groupId, page = 0, size = 30) =>
  api.get(`/api/v1/group/${groupId}/messages`, { params: { page, size } });

export const recallGroupMessage = (groupId, messageId) =>
  api.delete(`/api/v1/group/${groupId}/messages/${messageId}/recall`);

export const deleteGroupMessageForMe = (groupId, messageId) =>
  api.delete(`/api/v1/group/${groupId}/messages/${messageId}`);

export const pinGroupMessage = (groupId, messageId) =>
  api.post(`/api/v1/group/${groupId}/messages/${messageId}/pin`);

export const unpinGroupMessage = (groupId, messageId) =>
  api.delete(`/api/v1/group/${groupId}/messages/${messageId}/pin`);

export const getPinnedGroupMessages = (groupId) =>
  api.get(`/api/v1/group/${groupId}/pinned-messages`);

export const createGroupJoinRequest = (groupId, userIds) =>
  api.post(`/api/v1/group/${groupId}/join-requests`, { userIds });

export const getGroupJoinRequests = (groupId) =>
  api.get(`/api/v1/group/${groupId}/join-requests`);

export const approveGroupJoinRequest = (groupId, requestId) =>
  api.put(`/api/v1/group/${groupId}/join-requests/${requestId}/approve`);

export const rejectGroupJoinRequest = (groupId, requestId) =>
  api.put(`/api/v1/group/${groupId}/join-requests/${requestId}/reject`);

export const toggleGroupReaction = (messageId, emoji) =>
  api.post(`/api/v1/group-message/${messageId}/reactions`, null, { params: { emoji } });

export const deleteGroupReaction = (messageId) =>
  api.delete(`/api/v1/group-message/${messageId}/reactions`);

export const getGroupReactions = (messageId) =>
  api.get(`/api/v1/group-message/${messageId}/reactions`);

export const getGroupMedia = (groupId) =>
  api.get(`/api/v1/group/${groupId}/media`);
