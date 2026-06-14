package com.example.backend.report.repository;

import com.example.backend.report.entity.Report;
import com.example.backend.report.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findAllByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByReporter_IdAndReported_IdAndStatus(UUID reporterId, UUID reportedId, ReportStatus status);
}
