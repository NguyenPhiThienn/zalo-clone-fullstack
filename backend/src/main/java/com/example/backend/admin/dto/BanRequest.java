package com.example.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BanRequest {
    @NotBlank(message = "Lý do ban không được để trống")
    private String reason;
    private Integer durationDays; // null = vĩnh viễn, 1/7/30 = tạm thời
}
