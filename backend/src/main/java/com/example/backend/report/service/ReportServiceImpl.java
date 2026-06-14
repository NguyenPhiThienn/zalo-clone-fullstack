package com.example.backend.report.service;

import com.example.backend.admin.entity.AuditLog;
import com.example.backend.admin.repository.AuditLogRepository;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.report.dto.ReportDto;
import com.example.backend.report.dto.ReportRequest;
import com.example.backend.report.dto.ResolveReportRequest;
import com.example.backend.report.entity.Report;
import com.example.backend.report.entity.ReportStatus;
import com.example.backend.report.repository.ReportRepository;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;
    private final FileStorageService fileStorageService;
    private final com.example.backend.report.mapper.ReportMapper reportMapper;

    @Override
    @Transactional
    public ReportDto createReport(UUID reporterId, UUID reportedId, ReportRequest req) {
        if (reporterId.equals(reportedId)) {
            throw new IllegalArgumentException("Không thể tố cáo chính mình");
        }
        if (reportRepository.existsByReporter_IdAndReported_IdAndStatus(reporterId, reportedId, ReportStatus.PENDING)) {
            throw new IllegalArgumentException("Bạn đã có báo cáo đang chờ xử lý với người dùng này");
        }

        User reporter = getUser(reporterId);
        User reported = getUser(reportedId);

        Report report = Report.builder()
                .reporter(reporter)
                .reported(reported)
                .reason(req.getReason())
                .description(req.getDescription())
                .status(ReportStatus.PENDING)
                .evidenceKeys(req.getEvidenceKeys() != null ? req.getEvidenceKeys() : new ArrayList<>())
                .build();

        reportRepository.save(report);
        log.info("Report created: {} reported {}", reporterId, reportedId);
        return toDto(report);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReportDto> getReports(String status, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
            ReportStatus reportStatus = ReportStatus.valueOf(status.toUpperCase());
            return reportRepository.findAllByStatusOrderByCreatedAtDesc(reportStatus, pageable)
                    .map(this::toDto);
        }
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    @Override
    @Transactional
    public ReportDto resolveReport(Long reportId, UUID adminId, ResolveReportRequest req) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found: " + reportId));
        User admin = getUser(adminId);
        User reported = report.getReported();

        report.setStatus(ReportStatus.valueOf(req.getStatus().toUpperCase()));
        report.setResolvedAt(Instant.now());
        report.setResolvedBy(admin);
        report.setResolution(req.getResolution());
        reportRepository.save(report);

        String banAction = req.getBanAction() != null ? req.getBanAction() : "NONE";
        if (!"NONE".equalsIgnoreCase(banAction) && "RESOLVED".equalsIgnoreCase(req.getStatus())) {
            Integer durationDays = switch (banAction.toUpperCase()) {
                case "BAN_1_DAY"    -> 1;
                case "BAN_7_DAYS"   -> 7;
                case "BAN_30_DAYS"  -> 30;
                default             -> null; // BAN_PERMANENT
            };
            String banReason = "Vi phạm bị tố cáo: " + report.getReason()
                    + (req.getResolution() != null && !req.getResolution().isBlank()
                        ? " — " + req.getResolution() : "");

            reported.setBanned(true);
            reported.setBanReason(banReason);
            reported.setBannedAt(LocalDateTime.now());
            reported.setBanUntil(durationDays != null
                    ? LocalDateTime.now().plusDays(durationDays) : null);
            userRepository.save(reported);

            notificationService.sendAccountBanned(reported.getEmail(), banReason, reported.getBanUntil());

            AuditLog logEntry = AuditLog.builder()
                    .admin(admin)
                    .adminEmail(admin.getEmail())
                    .action("BAN_USER")
                    .targetType("USER")
                    .targetId(reported.getId())
                    .targetName((reported.getFirstName() + " " + reported.getLastName()).trim())
                    .details("Via report #" + reportId + " — " + banReason)
                    .build();
            auditLogRepository.save(logEntry);
        }

        log.info("Report {} resolved as {} (banAction={}) by {}", reportId, req.getStatus(), banAction, adminId);
        return toDto(report);
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private ReportDto toDto(Report r) {
        ReportDto dto = reportMapper.toDto(r);
        List<String> evidenceUrls = new ArrayList<>();
        if (r.getEvidenceKeys() != null) {
            for (String key : r.getEvidenceKeys()) {
                try {
                    evidenceUrls.add(fileStorageService.generatePresignedUrl(key));
                } catch (Exception e) {
                    log.warn("Cannot generate presigned URL for evidence key: {}", key);
                }
            }
        }
        dto.setEvidenceUrls(evidenceUrls);
        return dto;
    }
}
