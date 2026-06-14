package com.example.backend.report.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
@Builder
public class ReportRequest {
    @NotBlank(message = "Lý do tố cáo không được để trống")
    private String reason;
    private String description;
    /** Danh sách S3 key của file bằng chứng đã upload trước đó */
    @Builder.Default
    private List<String> evidenceKeys = new ArrayList<>();
}
