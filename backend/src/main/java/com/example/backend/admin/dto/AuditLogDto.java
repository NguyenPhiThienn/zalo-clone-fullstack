package com.example.backend.admin.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuditLogDto {
    private UUID id;
    private UUID adminId;
    private String adminEmail;
    private String action;
    private String targetType;
    private UUID targetId;
    private String targetName;
    private String details;
    private Instant createdAt;
}
