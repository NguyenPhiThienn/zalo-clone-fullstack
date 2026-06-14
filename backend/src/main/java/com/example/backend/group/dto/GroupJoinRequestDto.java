package com.example.backend.group.dto;

import java.util.UUID;

public record GroupJoinRequestDto(
        UUID id,
        UUID requestedById,
        String requestedByName,
        String requestedByAvatarUrl,
        UUID targetUserId,
        String targetUserName,
        String targetUserAvatarUrl,
        String createdDate
) {}
