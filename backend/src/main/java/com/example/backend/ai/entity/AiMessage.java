package com.example.backend.ai.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.UUID;
import com.example.backend.shared.entity.BaseAuditingEntity;
import com.example.backend.user.entity.User;

@Entity
@Table(name = "ai_message",
        indexes = {
                @Index(name = "idx_ai_message_user", columnList = "user_id"),
                @Index(name = "idx_ai_message_created", columnList = "created_date")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class AiMessage extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String role;  // "USER" hoặc "ASSISTANT"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
}
