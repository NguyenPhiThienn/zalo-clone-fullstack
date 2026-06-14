import { create } from 'zustand';
import useChatStore from './chatStore';

const getInitialAuth = () => {
  try {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  auth: getInitialAuth(),
  sessionReplaced: false,
  bannedInfo: null, // { reason: string, banUntil: string }

  setAuth: (authData) => {
    localStorage.setItem('auth', JSON.stringify(authData));
    set({ auth: authData });
  },

  updateAuth: (partial) => {
    set((state) => {
      const updated = { ...state.auth, ...partial };
      localStorage.setItem('auth', JSON.stringify(updated));
      return { auth: updated };
    });
  },

  logout: () => {
    localStorage.removeItem('auth');
    set({ auth: null, sessionReplaced: false, bannedInfo: null });
    // Reset chatStore để user mới không thừa hưởng state của user cũ
    useChatStore.getState().reset();
  },

  setSessionReplaced: () => set({ sessionReplaced: true }),

  setBannedInfo: (info) => set({ bannedInfo: info }),
  clearBannedInfo: () => set({ bannedInfo: null }),

  isLoggedIn: () => {
    const state = getInitialAuth();
    return !!state?.accessToken;
  },
}));

export default useAuthStore;
