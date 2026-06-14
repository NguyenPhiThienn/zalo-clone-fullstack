package com.example.backend.user.service;

import com.example.backend.user.dto.UserDto;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface BlockService {
    void blockUser(UUID blockerId, UUID targetId);
    void unblockUser(UUID blockerId, UUID targetId);
    boolean isBlocked(UUID u1, UUID u2);
    boolean isBlockedByMe(UUID blockerId, UUID targetId);
    List<UserDto> getBlockedUsers(UUID userId);
}
