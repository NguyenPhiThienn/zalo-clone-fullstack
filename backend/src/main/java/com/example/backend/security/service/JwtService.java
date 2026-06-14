package com.example.backend.security.service;

import java.util.Date;

public interface JwtService {
    String generateAccessToken(String email, String userId, String role, int tokenVersion);
    String generateRefreshToken(String email, String userId, int tokenVersion);
    boolean isTokenValid(String token);
    boolean isAccessToken(String token);
    String extractEmail(String token);
    String extractUserId(String token);
    int extractTokenVersion(String token);
    String extractRole(String token);
    Date extractExpiration(String token);
}
