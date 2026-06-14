package com.example.backend.group.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.backend.group.entity.PinnedGroupMessage;

public interface PinnedGroupMessageRepository extends JpaRepository<PinnedGroupMessage, UUID> {

    List<PinnedGroupMessage> findByGroupIdOrderByCreatedDateDesc(UUID groupId);

    Optional<PinnedGroupMessage> findByGroupIdAndMessageId(UUID groupId, UUID messageId);

    long countByGroupId(UUID groupId);

    void deleteByGroupIdAndMessageId(UUID groupId, UUID messageId);
}
