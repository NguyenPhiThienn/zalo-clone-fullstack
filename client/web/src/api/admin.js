import api from './axios';

export const getAdminUsers = (page = 0, size = 20) =>
  api.get('/api/v1/admin/users', { params: { page, size } });

export const getUserDetail = (userId) =>
  api.get(`/api/v1/admin/users/${userId}`);

export const banUser = (userId, data) =>
  api.patch(`/api/v1/admin/users/${userId}/ban`, data);

export const unbanUser = (userId) =>
  api.patch(`/api/v1/admin/users/${userId}/unban`);

export const deleteUser = (userId) =>
  api.delete(`/api/v1/admin/users/${userId}`);

export const promoteUser = (userId) =>
  api.patch(`/api/v1/admin/users/${userId}/promote`);

export const demoteUser = (userId) =>
  api.patch(`/api/v1/admin/users/${userId}/demote`);

export const resetPassword = (userId) =>
  api.patch(`/api/v1/admin/users/${userId}/reset-password`);

export const createAdminAccount = (data) =>
  api.post('/api/v1/admin/accounts', data);

export const getAdminGroups = (page = 0, size = 20) =>
  api.get('/api/v1/admin/groups', { params: { page, size } });

export const deleteAdminGroup = (groupId) =>
  api.delete(`/api/v1/admin/groups/${groupId}`);

export const getStats = () =>
  api.get('/api/v1/admin/stats');

export const getAuditLogs = (page = 0, size = 20) =>
  api.get('/api/v1/admin/audit-logs', { params: { page, size } });
