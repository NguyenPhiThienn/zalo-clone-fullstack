package com.example.backend.messaging.repository;

import com.example.backend.messaging.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {
    Optional<MessageReaction> findByMessageIdAndUserId(UUID messageId, UUID userId);
    List<MessageReaction> findByMessageId(UUID messageId);
    List<MessageReaction> findByMessageIdIn(Collection<UUID> messageIds);

    @Transactional
    void deleteByMessageIdAndUserId(UUID messageId, UUID userId);

    @Transactional
    void deleteByMessageIdIn(Collection<UUID> messageIds);
}
