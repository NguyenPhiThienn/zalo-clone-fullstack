package com.example.backend.admin.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdminGroupDto {
    private UUID id;
    private String name;
    private String description;
    private int memberCount;
    private UUID createdById;
    private String createdByName;
    private Instant createdDate;
}
