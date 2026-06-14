package com.example.backend.messaging.repository;

import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.enums.MessageState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByChatIdOrderByCreatedDateAsc(UUID chatId);
    Optional<Message> findTop1ByChatIdOrderByCreatedDateDesc(UUID chatId);
    Page<Message> findByChatIdAndDeletedFalse(UUID chatId, Pageable pageable);

    /**
     * Lấy tin nhắn cho một user cụ thể, loại trừ:
     *  - Tin bị thu hồi (deleted = true)
     *  - Tin user xóa phía mình (deletedBySender nếu là người gửi, deletedByReceiver nếu là người nhận)
     */
    /**
     * Lấy tin nhắn cho user, loại trừ tin bị xóa cá nhân.
     * Nếu user đã "xóa cuộc trò chuyện" và cung cấp deletedAt,
     * chỉ trả về tin nhắn được gửi SAU thời điểm đó.
     */
    @Query("SELECT m FROM Message m WHERE m.chat.id = :chatId AND m.deleted = false " +
           "AND NOT (m.deletedBySender = true AND m.sender.id = :userId) " +
           "AND NOT (m.deletedByReceiver = true AND m.sender.id <> :userId) " +
           "AND (:deletedAt IS NULL OR m.createdDate > :deletedAt)")
    Page<Message> findByChatIdForUser(@Param("chatId") UUID chatId,
                                      @Param("userId") UUID userId,
                                      @Param("deletedAt") Instant deletedAt,
                                      Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.chat.id = :chatId " +
            "AND m.sender.id <> :userId AND m.state <> com.example.backend.messaging.enums.MessageState.SEEN")
    int countUnreadMessages(@Param("chatId") UUID chatId, @Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Message m SET m.state = :state " +
            "WHERE m.chat.id = :chatId AND m.sender.id <> :userId " +
            "AND m.state <> com.example.backend.messaging.enums.MessageState.SEEN")
    void markMessagesAsRead(
            @Param("chatId") UUID chatId,
            @Param("userId") UUID userId,
            @Param("state") MessageState state
    );

    @Modifying
    @Query("UPDATE Message m SET m.state = :state " +
            "WHERE m.chat.id = :chatId AND m.sender.id <> :receiverId " +
            "AND m.state = com.example.backend.messaging.enums.MessageState.SENT")
    void markMessagesAsDelivered(
            @Param("chatId") UUID chatId,
            @Param("receiverId") UUID receiverId,
            @Param("state") MessageState state
    );

    @Modifying
    @Query("UPDATE Message m SET m.state = :state " +
            "WHERE m.sender.id <> :receiverId " +
            "AND m.state = com.example.backend.messaging.enums.MessageState.SENT")
    void markAllMessagesAsDelivered(
            @Param("receiverId") UUID receiverId,
            @Param("state") MessageState state
    );

    @Query("SELECT DISTINCT m.chat.id, m.sender.email FROM Message m " +
            "WHERE m.sender.id <> :receiverId " +
            "AND m.state = com.example.backend.messaging.enums.MessageState.SENT")
    List<Object[]> findChatsWithSentMessages(@Param("receiverId") UUID receiverId);

    @Modifying
    @Query("DELETE FROM Message m WHERE m.chat.id = :chatId")
    void deleteByChatId(@Param("chatId") UUID chatId);

    @Query("SELECT m.id FROM Message m WHERE m.chat.id = :chatId")
    List<UUID> findIdsByChatId(@Param("chatId") UUID chatId);

    long countByDeletedFalse();

    @Query("SELECT CAST(m.createdDate AS date), COUNT(m) FROM Message m " +
            "WHERE m.createdDate >= :since AND m.deleted = false " +
            "GROUP BY CAST(m.createdDate AS date) ORDER BY CAST(m.createdDate AS date) ASC")
    List<Object[]> countDailyMessages(@Param("since") Instant since);

    @Query("SELECT m.sender.id, COUNT(m) FROM Message m WHERE m.deleted = false " +
            "GROUP BY m.sender.id ORDER BY COUNT(m) DESC")
    List<Object[]> findTopSenderIds(Pageable pageable);

    // ─── Query cho AI đọc context chat đơn ──────────────────────────────────

    /**
     * Lấy N tin nhắn TEXT gần nhất của chat 1-1 (dùng cho AI smart reply / bot mention).
     * Trả về DESC → service sẽ reverse lại thành ASC trước khi đưa cho AI.
     */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender WHERE m.chat.id = :chatId AND m.deleted = false " +
           "AND m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
           "ORDER BY m.createdDate DESC")
    List<Message> findRecentTextMessagesForAi(@Param("chatId") UUID chatId, Pageable pageable);

    /**
     * Lấy tin nhắn TEXT trong khoảng thời gian cụ thể (dùng cho AI tóm tắt).
     */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender WHERE m.chat.id = :chatId AND m.deleted = false " +
           "AND m.createdDate BETWEEN :from AND :to " +
           "AND m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
           "ORDER BY m.createdDate ASC")
    List<Message> findMessagesForAiByDateRange(@Param("chatId") UUID chatId,
                                               @Param("from") Instant from,
                                               @Param("to") Instant to);
}
