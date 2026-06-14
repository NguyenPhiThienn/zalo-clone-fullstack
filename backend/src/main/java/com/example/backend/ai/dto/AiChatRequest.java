package com.example.backend.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class AiChatRequest {
    @NotBlank(message = "Message không được để trống")
    private String message;
}
