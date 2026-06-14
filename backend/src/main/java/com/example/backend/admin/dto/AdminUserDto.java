package com.example.backend.admin.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminUserDto {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
    private boolean banned;
    private String banReason;
    private LocalDateTime banUntil;
    private LocalDateTime bannedAt;
    private boolean online;
    private boolean emailVerified;
    private String avatarUrl;
    private LocalDateTime lastSeen;
    private Instant createdDate;
}
