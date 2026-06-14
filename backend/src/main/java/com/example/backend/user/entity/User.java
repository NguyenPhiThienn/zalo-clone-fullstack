package com.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;
import com.example.backend.shared.entity.BaseAuditingEntity;

@Entity
@Table(name = "user",
        indexes = {
                @Index(name = "idx_user_email", columnList = "email")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class User extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(unique = true, nullable = false)
    private String email;

    // ✅ THÊM MỚI: lưu mật khẩu đã hash (BCrypt)
    // nullable = true để tương thích nếu sau này vẫn muốn thêm OAuth
    @Column(name = "password")
    private String password;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(nullable = false)
    @Builder.Default
    private String role = "USER";

    @Column(nullable = false)
    @Builder.Default
    private boolean banned = false;

    @Column(name = "ban_reason", length = 500)
    private String banReason;

    @Column(name = "ban_until")
    private LocalDateTime banUntil;

    @Column(name = "banned_at")
    private LocalDateTime bannedAt;

    @Column(name = "is_online", nullable = false)
    @Builder.Default
    private boolean online = false;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "verification_code", length = 6)
    private String verificationCode;

    @Column(name = "verification_code_expiry")
    private LocalDateTime verificationCodeExpiry;

    @Column(name = "reset_password_code", length = 6)
    private String resetPasswordCode;

    @Column(name = "reset_password_code_expiry")
    private LocalDateTime resetPasswordCodeExpiry;

    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private int tokenVersion = 1;

    @Transient
    public boolean isAdmin() {
        return "ADMIN".equals(this.role);
    }

    @Transient
    public boolean isUserOnline() {
        return this.online;
    }

    @Transient
    public String getLastSeenText() {
        if (online) return "Đang hoạt động";
        if (lastSeen == null) return "Không xác định";

        long minutesAgo = java.time.Duration.between(lastSeen, LocalDateTime.now()).toMinutes();
        if (minutesAgo < 1) return "Vừa xong";
        if (minutesAgo < 60) return minutesAgo + " phút trước";
        if (minutesAgo < 1440) return (minutesAgo / 60) + " giờ trước";
        return (minutesAgo / 1440) + " ngày trước";
    }
}