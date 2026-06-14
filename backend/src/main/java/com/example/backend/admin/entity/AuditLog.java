package com.example.backend.admin.entity;

import com.example.backend.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class AuditLog {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(name = "admin_email", nullable = false)
    private String adminEmail;

    @Column(nullable = false, length = 50)
    private String action; // BAN_USER, UNBAN_USER, DELETE_USER, PROMOTE, DEMOTE, DELETE_GROUP, CREATE_ADMIN, RESET_PASSWORD

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType; // USER, GROUP

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "target_name")
    private String targetName;

    @Column(columnDefinition = "TEXT")
    private String details;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
