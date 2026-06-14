package com.example.backend.call.repository;

import com.example.backend.call.entity.CallSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {

    @Query("SELECT cs FROM CallSession cs " +
           "JOIN FETCH cs.initiator " +
           "JOIN FETCH cs.receiver " +
           "WHERE cs.chat.id = :chatId " +
           "ORDER BY cs.startedAt DESC")
    List<CallSession> findByChatIdOrderByStartedAtDesc(@Param("chatId") UUID chatId);
}
