package com.example.backend.group.entity;

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
@Table(name = "group_member",
        indexes = {
                @Index(name = "idx_group_member_group", columnList = "group_id"),
                @Index(name = "idx_group_member_user", columnList = "user_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_group_member",
                        columnNames = {"group_id", "user_id"}
                )
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder
public class GroupMember extends BaseAuditingEntity {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // true = admin nhóm, false = thành viên thường
    @Column(nullable = false)
    @Builder.Default
    private boolean admin = false;

    // Factory method tiện dụng
    public static GroupMember of(Group group, User user, boolean isAdmin) {
        return GroupMember.builder()
                .group(group)
                .user(user)
                .admin(isAdmin)
                .build();
    }
}