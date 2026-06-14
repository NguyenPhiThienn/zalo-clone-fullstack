// api/auth.ts — đồng bộ với AuthController & AuthRequest/AuthResponse DTO
import { fetchAPI } from "@/lib/fetch";

// ─── Auth Register ────────────────────────────────────────────────────────────
// POST /api/v1/auth/register → 201 Created (no body)
// Backend trả 201 KHÔNG có body → phải verify email trước khi đăng nhập
export interface RegisterPayload {
  email: string;
  password: string;  // min 6 chars
  firstName: string;
  lastName?: string;
}

// POST /api/v1/auth/verify-email → AuthResponse (có accessToken)
export interface VerifyEmailPayload {
  email: string;
  code: string;
}

// POST /api/v1/auth/resend-verification → 200 (no body)
export interface ResendVerificationPayload {
  email: string;
}

// POST /api/v1/auth/login → AuthResponse
export interface LoginPayload {
  email: string;
  password: string;
}

// POST /api/v1/auth/refresh → AuthResponse
export interface RefreshTokenPayload {
  refreshToken: string;
}

// POST /api/v1/auth/forgot-password → 200 (no body)
export interface ForgotPasswordPayload {
  email: string;
}

// POST /api/v1/auth/reset-password → 200 (no body)
export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

// ─── AuthResponse (khớp với AuthResponse.java) ────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;  // UUID as string on mobile
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  online: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** POST /api/v1/auth/register → 201 No Body. Backend gửi email OTP */
export const register = async (data: RegisterPayload): Promise<void> => {
  await fetchAPI("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/verify-email → AuthResponse (accessToken) */
export const verifyEmail = async (data: VerifyEmailPayload): Promise<AuthResponse> => {
  return fetchAPI("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/resend-verification → void */
export const resendVerification = async (data: ResendVerificationPayload): Promise<void> => {
  await fetchAPI("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/login → AuthResponse */
export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  return fetchAPI("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/refresh → AuthResponse */
export const refreshToken = async (data: RefreshTokenPayload): Promise<AuthResponse> => {
  return fetchAPI("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/logout → void (cần Bearer token) */
export const logout = async (): Promise<void> => {
  await fetchAPI("/auth/logout", { method: "POST" });
};

/** POST /api/v1/auth/forgot-password → void */
export const forgotPassword = async (data: ForgotPasswordPayload): Promise<void> => {
  await fetchAPI("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/auth/reset-password → void */
export const resetPassword = async (data: ResetPasswordPayload): Promise<void> => {
  await fetchAPI("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
