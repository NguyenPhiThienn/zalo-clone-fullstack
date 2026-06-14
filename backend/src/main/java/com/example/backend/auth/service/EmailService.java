package com.example.backend.auth.service;

public interface EmailService {
    void sendVerificationEmail(String toEmail, String firstName, String code);
    void sendResetPasswordEmail(String toEmail, String firstName, String code);
}
