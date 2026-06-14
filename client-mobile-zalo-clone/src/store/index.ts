import { AuthStore, User } from '@/types/type';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token: string, user: User) => set({ token, user }),
      setHasHydrated: (state: boolean) => set({ hasHydrated: state }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'zalo-clone-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        return () => {
          if (state && typeof window !== 'undefined') {
            state.setHasHydrated(true);
          }
        };
      },
    }
  )
);