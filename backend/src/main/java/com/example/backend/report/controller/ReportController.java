package com.example.backend.report.controller;

import com.example.backend.file.service.FileStorageService;
import com.example.backend.report.dto.ReportDto;
import com.example.backend.report.dto.ReportRequest;
import com.example.backend.report.dto.ResolveReportRequest;
import com.example.backend.report.service.ReportService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    // ─── User: upload file bằng chứng ───────────────────────────────────────

    /**
     * Upload một file bằng chứng lên S3.
     * Frontend gọi endpoint này trước khi submit report, lấy key trả về,
     * rồi đính kèm vào danh sách evidenceKeys khi gửi report.
     *
     * POST /api/v1/report/evidence
     * Response: { "key": "...", "url": "..." }
     */
    @PostMapping("/api/v1/report/evidence")
    public ResponseEntity<Map<String, String>> uploadEvidence(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {
        String key = fileStorageService.saveFile(file);
        String url = fileStorageService.generatePresignedUrl(key);
        return ResponseEntity.ok(Map.of("key", key, "url", url));
    }

    // ─── User: tố cáo người dùng khác ───────────────────────────────────────

    @PostMapping("/api/v1/report/{userId}")
    public ResponseEntity<ReportDto> createReport(
            @PathVariable UUID userId,
            @Valid @RequestBody ReportRequest req,
            Authentication auth) {
        User reporter = getUser(auth);
        return ResponseEntity.ok(reportService.createReport(reporter.getId(), userId, req));
    }

    // ─── Admin: quản lý báo cáo ──────────────────────────────────────────────

    @GetMapping("/api/v1/admin/reports")
    @Secured("ROLE_ADMIN")
    public ResponseEntity<Page<ReportDto>> getReports(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reportService.getReports(status, page, size));
    }

    @PatchMapping("/api/v1/admin/reports/{id}/resolve")
    @Secured("ROLE_ADMIN")
    public ResponseEntity<ReportDto> resolveReport(
            @PathVariable Long id,
            @RequestBody ResolveReportRequest req,
            Authentication auth) {
        User admin = getUser(auth);
        return ResponseEntity.ok(reportService.resolveReport(id, admin.getId(), req));
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
