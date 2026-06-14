package com.example.backend.group.repository;

import java.util.Set;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.backend.group.entity.GroupMessageHidden;
import com.example.backend.group.entity.GroupMessageHidden.GroupMessageHiddenId;

public interface GroupMessageHiddenRepository extends JpaRepository<GroupMessageHidden, GroupMessageHiddenId> {

    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END FROM GroupMessageHidden h WHERE h.message.id = :messageId AND h.user.id = :userId")
    boolean existsByMessageIdAndUserId(@Param("messageId") UUID messageId, @Param("userId") UUID userId);

    @Query("SELECT h.message.id FROM GroupMessageHidden h WHERE h.message.id IN :messageIds AND h.user.id = :userId")
    Set<UUID> findHiddenMessageIds(@Param("messageIds") Iterable<UUID> messageIds, @Param("userId") UUID userId);
}
