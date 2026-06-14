package com.example.backend.report.dto;

import com.example.backend.report.entity.ReportStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportDto {
    private Long id;
    private UUID reporterId;
    private String reporterName;
    private String reporterEmail;
    private UUID reportedId;
    private String reportedName;
    private String reportedEmail;
    private String reason;
    private String description;
    private ReportStatus status;
    private Instant createdAt;
    private Instant resolvedAt;
    private String resolution;
    private boolean reportedBanned;
    /** Presigned URLs của file bằng chứng (sinh mới mỗi lần trả về) */
    private List<String> evidenceUrls;
}
