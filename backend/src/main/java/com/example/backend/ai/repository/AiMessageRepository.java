package com.example.backend.ai.repository;

import com.example.backend.ai.entity.AiMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface AiMessageRepository extends JpaRepository<AiMessage, UUID> {
    List<AiMessage> findTop20ByUserIdOrderByCreatedDateDesc(UUID userId);
    Page<AiMessage> findByUserIdOrderByCreatedDateAsc(UUID userId, Pageable pageable);
    @Transactional
    void deleteByUserId(UUID userId);
}
