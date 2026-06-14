package com.example.backend.group.dto;

import com.example.backend.messaging.enums.MessageType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GroupMemberDto {
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private boolean admin;
    private boolean online;
    private String lastSeenText;
}