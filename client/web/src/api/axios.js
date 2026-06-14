import axios from 'axios';
import useAuthStore from '../store/authStore';
import wsService from '../services/websocket';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
api.interceptors.request.use(
  (config) => {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isSessionReplaced = (responseData) =>
  responseData?.error === 'SESSION_REPLACED' ||
  (typeof responseData === 'string' && responseData.includes('SESSION_REPLACED'));

const showSessionReplacedModal = () => {
  useAuthStore.getState().setSessionReplaced();
};

const forceLogout = () => {
  // Nếu modal session replaced đang hiện → không redirect, để user bấm OK
  if (useAuthStore.getState().sessionReplaced) return;
  localStorage.removeItem('auth');
  window.location.href = '/login';
};

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Tài khoản bị ban → hiện BannedModal
    if (error.response?.status === 403 &&
        error.response?.data?.error === 'ACCOUNT_BANNED') {
      useAuthStore.getState().setBannedInfo({ reason: error.response.data.reason || '' });
      wsService.disconnect();
      return Promise.reject(error);
    }

    // Session bị thay thế → hiện modal, không refresh
    if (error.response?.status === 401 && isSessionReplaced(error.response?.data)) {
      showSessionReplacedModal();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      if (!auth.refreshToken) {
        isRefreshing = false;
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refreshToken: auth.refreshToken,
        });

        const { accessToken, refreshToken } = response.data;
        const newAuth = { ...auth, accessToken, refreshToken };
        localStorage.setItem('auth', JSON.stringify(newAuth));

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // Refresh token hết hạn do session replaced → hiện modal
        const refreshErrData = refreshError.response?.data;
        if (isSessionReplaced(refreshErrData) || refreshErrData?.message === 'SESSION_REPLACED') {
          showSessionReplacedModal();
        } else {
          forceLogout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
