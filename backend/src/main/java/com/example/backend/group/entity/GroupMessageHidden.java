package com.example.backend.group.entity;

import java.io.Serializable;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.example.backend.user.entity.User;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "group_message_hidden")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@IdClass(GroupMessageHidden.GroupMessageHiddenId.class)
@Builder
public class GroupMessageHidden {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private GroupMessage message;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
    public static class GroupMessageHiddenId implements Serializable {
        @JdbcTypeCode(SqlTypes.CHAR)
        private UUID message;
        @JdbcTypeCode(SqlTypes.CHAR)
        private UUID user;
    }
}
