package com.example.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs
// ─────────────────────────────────────────────────────────────────────────────

public class AuthRequest {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Register {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
        private String password;

        @NotBlank(message = "Họ không được để trống")
        private String firstName;

        private String lastName;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Login {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RefreshToken {
        @NotBlank(message = "Refresh token không được để trống")
        private String refreshToken;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VerifyEmail {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String code;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ForgotPassword {
        @NotBlank @Email
        private String email;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResetPassword {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String code;
        @NotBlank @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
        private String newPassword;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResendVerification {
        @NotBlank @Email
        private String email;
    }
}