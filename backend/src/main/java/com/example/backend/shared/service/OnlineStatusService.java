package com.example.backend.shared.service;

import java.util.UUID;

public interface OnlineStatusService {
    void setOnline(UUID userId);
    void setOffline(UUID userId);
    boolean isOnline(UUID userId);
    void refreshTtl(UUID userId);
}
