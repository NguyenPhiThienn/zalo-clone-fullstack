import api from './axios';

export const register = (data) =>
  api.post('/api/v1/auth/register', data);

export const verifyEmail = (data) =>
  api.post('/api/v1/auth/verify-email', data);

export const resendVerification = (data) =>
  api.post('/api/v1/auth/resend-verification', data);

export const login = (data) =>
  api.post('/api/v1/auth/login', data);

export const forgotPassword = (data) =>
  api.post('/api/v1/auth/forgot-password', data);

export const resetPassword = (data) =>
  api.post('/api/v1/auth/reset-password', data);

export const refreshToken = (refreshToken) =>
  api.post('/api/v1/auth/refresh', { refreshToken });

export const logout = () =>
  api.post('/api/v1/auth/logout');
