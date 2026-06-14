package com.example.backend.messaging.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.UUID;
import com.example.backend.shared.entity.BaseAuditingEntity;
import com.example.backend.user.entity.User;
import com.example.backend.messaging.entity.Message;

@Entity
@Table(name = "message_reaction",
        uniqueConstraints = @UniqueConstraint(name = "uk_message_reaction", columnNames = {"message_id", "user_id"}),
        indexes = @Index(name = "idx_reaction_message", columnList = "message_id")
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class MessageReaction extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    private String emoji;
}
