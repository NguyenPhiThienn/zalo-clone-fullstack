package com.example.backend.shared.service;

import java.util.UUID;

public interface GroupUnreadService {
    void increment(UUID groupId, UUID userId);
    void clear(UUID groupId, UUID userId);
    int getCount(UUID groupId, UUID userId);
    void deleteGroup(UUID groupId);
}
