package com.example.backend.reaction.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReactionDto {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private String emoji;
    private Instant createdDate;
}
