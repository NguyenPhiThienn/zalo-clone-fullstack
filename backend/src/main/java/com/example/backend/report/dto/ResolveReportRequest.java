package com.example.backend.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResolveReportRequest {
    /** RESOLVED | DISMISSED */
    private String status;
    /** Ghi chú xử lý (tuỳ chọn) */
    private String resolution;
    /** NONE | BAN_1_DAY | BAN_7_DAYS | BAN_30_DAYS | BAN_PERMANENT */
    @Builder.Default
    private String banAction = "NONE";
}
