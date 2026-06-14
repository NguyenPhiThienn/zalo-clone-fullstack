package com.example.backend.ai.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AiMessageDto {
    private UUID id;
    private String role;     // "USER" hoặc "ASSISTANT"
    private String content;
    private Instant createdDate;
}
