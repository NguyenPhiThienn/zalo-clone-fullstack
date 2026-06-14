package com.example.backend.user.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
public class UserDto {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private LocalDateTime lastSeen;
    private boolean online;
    private String lastSeenText;
    private String role;
    private boolean banned;
    private String avatarUrl;
    private String friendshipStatus; // NONE, PENDING_SENT, PENDING_RECEIVED, ACCEPTED
    private String blockStatus; // NONE, BLOCKED_BY_ME, BLOCKED_BY_THEM
}
