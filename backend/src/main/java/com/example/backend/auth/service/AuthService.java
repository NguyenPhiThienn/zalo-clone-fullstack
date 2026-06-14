package com.example.backend.auth.service;

import com.example.backend.auth.dto.AuthRequest;
import com.example.backend.auth.dto.AuthResponse;

public interface AuthService {
    void register(AuthRequest.Register request);
    AuthResponse verifyEmail(AuthRequest.VerifyEmail request);
    void resendVerification(AuthRequest.ResendVerification request);
    AuthResponse login(AuthRequest.Login request);
    void forgotPassword(AuthRequest.ForgotPassword request);
    void resetPassword(AuthRequest.ResetPassword request);
    AuthResponse refreshToken(AuthRequest.RefreshToken request);
    void logout(String email, String token);
}
