package com.example.backend.report.service;

import com.example.backend.report.dto.ReportDto;
import com.example.backend.report.dto.ReportRequest;
import com.example.backend.report.dto.ResolveReportRequest;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface ReportService {
    ReportDto createReport(UUID reporterId, UUID reportedId, ReportRequest req);
    Page<ReportDto> getReports(String status, int page, int size);
    ReportDto resolveReport(Long reportId, UUID adminId, ResolveReportRequest req);
}
