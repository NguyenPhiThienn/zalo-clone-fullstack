package com.example.backend.services;

import com.example.backend.admin.entity.AuditLog;
import com.example.backend.admin.repository.AuditLogRepository;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.report.dto.ReportDto;
import com.example.backend.report.dto.ReportRequest;
import com.example.backend.report.dto.ResolveReportRequest;
import com.example.backend.report.entity.Report;
import com.example.backend.report.entity.ReportStatus;
import com.example.backend.report.repository.ReportRepository;
import com.example.backend.report.service.ReportService;
import com.example.backend.report.service.ReportServiceImpl;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.report.mapper.ReportMapper;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportService Unit Tests")
class ReportServiceTest {

    @Mock ReportRepository reportRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock AuditLogRepository auditLogRepository;
    @Mock FileStorageService fileStorageService;
    @Mock ReportMapper reportMapper;

    @InjectMocks ReportServiceImpl reportService;

    private User reporter;
    private User reported;
    private User admin;
    private Report pendingReport;
    private Long reportId = 1L;

    @BeforeEach
    void setUp() {
        reporter = User.builder()
                .id(UUID.randomUUID())
                .email("reporter@gmail.com")
                .firstName("Reporter")
                .lastName("User")
                .build();

        reported = User.builder()
                .id(UUID.randomUUID())
                .email("reported@gmail.com")
                .firstName("Reported")
                .lastName("User")
                .banned(false)
                .build();

        admin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@gmail.com")
                .firstName("Admin")
                .lastName("User")
                .build();

        pendingReport = Report.builder()
                .id(reportId)
                .reporter(reporter)
                .reported(reported)
                .reason("Spam")
                .status(ReportStatus.PENDING)
                .build();

        ReportDto reportDto = new ReportDto();
        reportDto.setReason("Spam");
        lenient().when(reportMapper.toDto(any(Report.class))).thenReturn(reportDto);
    }

    // ─── createReport ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("createReport() - thành công")
    void createReport_success() {
        ReportRequest req = ReportRequest.builder()
                .reason("Spam")
                .description("Gửi spam liên tục")
                .build();

        when(reportRepository.existsByReporter_IdAndReported_IdAndStatus(
                reporter.getId(), reported.getId(), ReportStatus.PENDING)).thenReturn(false);
        when(userRepository.findById(reporter.getId())).thenReturn(Optional.of(reporter));
        when(userRepository.findById(reported.getId())).thenReturn(Optional.of(reported));
        when(reportRepository.save(any())).thenReturn(pendingReport);

        ReportDto result = reportService.createReport(reporter.getId(), reported.getId(), req);

        assertThat(result).isNotNull();
        assertThat(result.getReason()).isEqualTo("Spam");
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    @DisplayName("createReport() - tự tố cáo chính mình → throw")
    void createReport_selfReport_throws() {
        ReportRequest req = ReportRequest.builder().reason("Spam").build();
        assertThatThrownBy(() -> reportService.createReport(reporter.getId(), reporter.getId(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chính mình");
    }

    @Test
    @DisplayName("createReport() - đã có report pending → throw")
    void createReport_duplicatePending_throws() {
        ReportRequest req = ReportRequest.builder().reason("Spam").build();
        when(reportRepository.existsByReporter_IdAndReported_IdAndStatus(
                reporter.getId(), reported.getId(), ReportStatus.PENDING)).thenReturn(true);

        assertThatThrownBy(() -> reportService.createReport(reporter.getId(), reported.getId(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("đang chờ xử lý");
    }

    @Test
    @DisplayName("createReport() - reported user không tồn tại → ResourceNotFoundException")
    void createReport_reportedNotFound_throws() {
        ReportRequest req = ReportRequest.builder().reason("Spam").build();
        when(reportRepository.existsByReporter_IdAndReported_IdAndStatus(
                reporter.getId(), reported.getId(), ReportStatus.PENDING)).thenReturn(false);
        when(userRepository.findById(reporter.getId())).thenReturn(Optional.of(reporter));
        when(userRepository.findById(reported.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.createReport(reporter.getId(), reported.getId(), req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getReports ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getReports() - lấy tất cả reports")
    void getReports_all() {
        Page<Report> page = new PageImpl<>(List.of(pendingReport));
        when(reportRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(page);

        Page<ReportDto> result = reportService.getReports("ALL", 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getReports() - lọc theo status PENDING")
    void getReports_byPendingStatus() {
        Page<Report> page = new PageImpl<>(List.of(pendingReport));
        when(reportRepository.findAllByStatusOrderByCreatedAtDesc(eq(ReportStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        Page<ReportDto> result = reportService.getReports("PENDING", 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
        verify(reportRepository).findAllByStatusOrderByCreatedAtDesc(eq(ReportStatus.PENDING), any());
    }

    @Test
    @DisplayName("getReports() - status null → lấy tất cả")
    void getReports_nullStatus_returnsAll() {
        Page<Report> page = new PageImpl<>(List.of(pendingReport));
        when(reportRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class))).thenReturn(page);

        Page<ReportDto> result = reportService.getReports(null, 0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ─── resolveReport ────────────────────────────────────────────────────────

    @Test
    @DisplayName("resolveReport() - RESOLVED không ban")
    void resolveReport_resolvedNoBan() {
        ResolveReportRequest req = ResolveReportRequest.builder()
                .status("RESOLVED")
                .resolution("Đã cảnh cáo")
                .banAction("NONE")
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(pendingReport));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(reportRepository.save(any())).thenReturn(pendingReport);

        ReportDto result = reportService.resolveReport(reportId, admin.getId(), req);

        assertThat(result).isNotNull();
        assertThat(pendingReport.getStatus()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(reported.isBanned()).isFalse();
    }

    @Test
    @DisplayName("resolveReport() - RESOLVED + BAN_7_DAYS → user bị ban 7 ngày")
    void resolveReport_resolvedWithBan7Days() {
        ResolveReportRequest req = ResolveReportRequest.builder()
                .status("RESOLVED")
                .resolution("Ban 7 ngày")
                .banAction("BAN_7_DAYS")
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(pendingReport));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(reportRepository.save(any())).thenReturn(pendingReport);
        when(userRepository.save(any())).thenReturn(reported);
        when(auditLogRepository.save(any())).thenReturn(new AuditLog());
        doNothing().when(notificationService).sendAccountBanned(any(), any(), any());

        reportService.resolveReport(reportId, admin.getId(), req);

        assertThat(reported.isBanned()).isTrue();
        assertThat(reported.getBanUntil()).isNotNull();
        verify(notificationService).sendAccountBanned(eq(reported.getEmail()), any(), any());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("resolveReport() - RESOLVED + BAN_PERMANENT → ban vĩnh viễn")
    void resolveReport_resolvedWithPermanentBan() {
        ResolveReportRequest req = ResolveReportRequest.builder()
                .status("RESOLVED")
                .resolution("Ban vĩnh viễn")
                .banAction("BAN_PERMANENT")
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(pendingReport));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(reportRepository.save(any())).thenReturn(pendingReport);
        when(userRepository.save(any())).thenReturn(reported);
        when(auditLogRepository.save(any())).thenReturn(new AuditLog());
        doNothing().when(notificationService).sendAccountBanned(any(), any(), any());

        reportService.resolveReport(reportId, admin.getId(), req);

        assertThat(reported.isBanned()).isTrue();
        assertThat(reported.getBanUntil()).isNull(); // permanent
    }

    @Test
    @DisplayName("resolveReport() - report không tồn tại → ResourceNotFoundException")
    void resolveReport_notFound_throws() {
        when(reportRepository.findById(reportId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.resolveReport(reportId, admin.getId(),
                ResolveReportRequest.builder().status("RESOLVED").banAction("NONE").build()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("resolveReport() - DISMISSED không ban")
    void resolveReport_dismissed() {
        ResolveReportRequest req = ResolveReportRequest.builder()
                .status("DISMISSED")
                .resolution("Không vi phạm")
                .banAction("NONE")
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(pendingReport));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(reportRepository.save(any())).thenReturn(pendingReport);

        ReportDto result = reportService.resolveReport(reportId, admin.getId(), req);

        assertThat(result).isNotNull();
        assertThat(pendingReport.getStatus()).isEqualTo(ReportStatus.DISMISSED);
        assertThat(reported.isBanned()).isFalse();
        verify(userRepository, never()).save(reported);
    }
}
