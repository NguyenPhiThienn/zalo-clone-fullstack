package com.example.backend.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;
import com.example.backend.shared.entity.BaseAuditingEntity;
import com.example.backend.user.entity.User;

@Entity
@Table(name = "chat",
        indexes = {
                @Index(name = "idx_chat_user1", columnList = "user1_id"),
                @Index(name = "idx_chat_user2", columnList = "user2_id")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class Chat extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    @Column(name = "deleted_by_user1", nullable = false)
    @Builder.Default
    private boolean deletedByUser1 = false;

    @Column(name = "deleted_by_user2", nullable = false)
    @Builder.Default
    private boolean deletedByUser2 = false;

    /** Thời điểm user1 xóa chat — dùng để lọc tin nhắn cũ khi mở lại */
    @Column(name = "deleted_at_by_user1")
    private Instant deletedAtByUser1;

    /** Thời điểm user2 xóa chat — dùng để lọc tin nhắn cũ khi mở lại */
    @Column(name = "deleted_at_by_user2")
    private Instant deletedAtByUser2;

    /** Trả về timestamp xóa của user hiện tại (null nếu chưa xóa) */
    @Transient
    public Instant getDeletedAtFor(UUID userId) {
        if (user1.getId().equals(userId)) return deletedAtByUser1;
        if (user2.getId().equals(userId)) return deletedAtByUser2;
        return null;
    }
    @Transient
    public User getOtherUser(UUID currentUserId) {
        if (user1.getId().equals(currentUserId)) return user2;
        if (user2.getId().equals(currentUserId)) return user1;
        throw new IllegalArgumentException(
                "User " + currentUserId + " is not a member of chat " + this.id
        );
    }

    @Transient
    public String getChatName(UUID currentUserId) {
        User other = getOtherUser(currentUserId);
        return other.getFirstName() + " " + other.getLastName();
    }

    @Transient
    public boolean containsUser(UUID userId) {
        return user1.getId().equals(userId) || user2.getId().equals(userId);
    }
}