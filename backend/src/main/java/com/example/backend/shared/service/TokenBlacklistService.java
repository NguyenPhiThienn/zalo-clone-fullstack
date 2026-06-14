package com.example.backend.shared.service;

import java.util.Date;

public interface TokenBlacklistService {
    void blacklist(String token, Date expiration);
    boolean isBlacklisted(String token);
}
