package com.example.backend.group.entity;

import com.example.backend.messaging.enums.MessageType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.UUID;
import com.example.backend.shared.entity.BaseAuditingEntity;
import com.example.backend.user.entity.User;
import com.example.backend.group.entity.Group;

@Entity
@Table(name = "group_message",
        indexes = {
                @Index(name = "idx_group_message_group", columnList = "group_id"),
                @Index(name = "idx_group_message_sender", columnList = "sender_id"),
                @Index(name = "idx_group_message_created", columnList = "created_date")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class GroupMessage extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    private String fileName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
}