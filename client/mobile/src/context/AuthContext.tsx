// context/AuthContext.tsx — đồng bộ với AuthController mới
// Key change: register() → void (BE gửi OTP email), login cần verifyEmail trước
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from '@/store';
import { login as apiLogin, verifyEmail as apiVerifyEmail, logout as apiLogout, AuthResponse } from '@/api/auth';
import { User } from '@/types/type';

export interface AuthContextType {
  login: (email: string, password: string) => Promise<AuthResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  user: User | null;
  token: string | null;
  hasHydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setAuth, logout: clearAuth, user, token, hasHydrated } = useAuthStore();

  /** POST /api/v1/auth/login → trả về AuthResponse (trực tiếp có token) */
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    // ─── REAL API ─────────────────────────────────────────────────────────────
    const response: AuthResponse = await apiLogin({ email, password });

    if (!response?.accessToken) {
      throw new Error('Phản hồi đăng nhập không hợp lệ');
    }

    const userData: User = {
      id: response.userId,
      name: `${response.firstName || ''} ${response.lastName || ''}`.trim(),
      email: response.email,
      role: response.role,
      avatar: response.avatarUrl,
    };

    setAuth(response.accessToken, userData);
    return response;
  };

  /** POST /api/v1/auth/verify-email → xác thực OTP sau khi đăng ký */
  const verifyEmail = async (email: string, code: string): Promise<void> => {
    const response: AuthResponse = await apiVerifyEmail({ email, code });

    if (!response?.accessToken) {
      throw new Error('Xác thực thất bại');
    }

    const userData: User = {
      id: response.userId,
      name: `${response.firstName || ''} ${response.lastName || ''}`.trim(),
      email: response.email,
      role: response.role,
      avatar: response.avatarUrl,
    };

    setAuth(response.accessToken, userData);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (_) { }
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ login, verifyEmail, logout, setAuth, user, token, hasHydrated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
