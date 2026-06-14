package com.example.backend.group.repository;

import com.example.backend.group.entity.GroupMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMessageRepository extends JpaRepository<GroupMessage, UUID> {

    Page<GroupMessage> findByGroupIdAndDeletedFalseOrderByCreatedDateDesc(UUID groupId, Pageable pageable);

    Optional<GroupMessage> findTop1ByGroupIdAndDeletedFalseOrderByCreatedDateDesc(UUID groupId);

    // Giữ lại để tương thích với code cũ gọi không có deleted filter
    Optional<GroupMessage> findTop1ByGroupIdOrderByCreatedDateDesc(UUID groupId);

    long countByDeletedFalse();

    @Query("SELECT CAST(m.createdDate AS date), COUNT(m) FROM GroupMessage m " +
            "WHERE m.createdDate >= :since AND m.deleted = false " +
            "GROUP BY CAST(m.createdDate AS date) ORDER BY CAST(m.createdDate AS date) ASC")
    List<Object[]> countDailyGroupMessages(@Param("since") Instant since);

    @Query("SELECT m.sender.id, COUNT(m) FROM GroupMessage m WHERE m.deleted = false " +
            "GROUP BY m.sender.id ORDER BY COUNT(m) DESC")
    List<Object[]> findTopGroupSenderIds(Pageable pageable);

    // ─── Query cho Media Panel ────────────────────────────────────────────────

    @Query("SELECT m FROM GroupMessage m " +
            "WHERE m.group.id = :groupId AND m.deleted = false AND m.type = :type " +
            "ORDER BY m.createdDate DESC")
    List<GroupMessage> findByGroupIdAndType(
            @Param("groupId") UUID groupId,
            @Param("type") com.example.backend.messaging.enums.MessageType type);

    @Query("SELECT m FROM GroupMessage m " +
            "WHERE m.group.id = :groupId AND m.deleted = false " +
            "AND m.type IN :types " +
            "ORDER BY m.createdDate DESC")
    List<GroupMessage> findByGroupIdAndTypeIn(
            @Param("groupId") UUID groupId,
            @Param("types") java.util.List<com.example.backend.messaging.enums.MessageType> types);

    @Query("SELECT m FROM GroupMessage m " +
            "WHERE m.group.id = :groupId AND m.deleted = false " +
            "AND m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
            "AND m.content LIKE '%http%' " +
            "ORDER BY m.createdDate DESC")
    List<GroupMessage> findTextMessagesWithLinks(@Param("groupId") UUID groupId);

    // ─── Query cho AI đọc context nhóm ──────────────────────────────────────

    /**
     * Lấy N tin nhắn gần nhất của nhóm (dùng cho AI tóm tắt / trả lời câu hỏi về nhóm).
     * Trả về DESC → service sẽ reverse lại thành ASC trước khi đưa cho AI.
     */
    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
            "WHERE m.group.id = :groupId " +
            "AND m.deleted = false " +
            "AND (m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
            " OR m.type = com.example.backend.messaging.enums.MessageType.SYSTEM) " +
            "ORDER BY m.createdDate DESC")
    List<GroupMessage> findRecentTextMessagesForAi(
            @Param("groupId") UUID groupId,
            Pageable pageable);

    /**
     * Lấy tin nhắn trong khoảng thời gian cụ thể (dùng khi user hỏi "tóm tắt hôm nay", "2 giờ qua", v.v.)
     */
    @Query("SELECT m FROM GroupMessage m JOIN FETCH m.sender " +
            "WHERE m.group.id = :groupId " +
            "AND m.deleted = false " +
            "AND m.createdDate BETWEEN :from AND :to " +
            "AND (m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
            " OR m.type = com.example.backend.messaging.enums.MessageType.SYSTEM) " +
            "ORDER BY m.createdDate ASC")
    List<GroupMessage> findMessagesForAiByDateRange(
            @Param("groupId") UUID groupId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Đếm tổng tin nhắn của nhóm (AI biết nhóm đang hoạt động nhiều hay ít).
     */
    @Query("SELECT COUNT(m) FROM GroupMessage m " +
            "WHERE m.group.id = :groupId AND m.deleted = false")
    long countByGroupId(@Param("groupId") UUID groupId);

    /**
     * Thống kê ai nói nhiều nhất trong nhóm trong khoảng thời gian (AI dùng cho insight).
     */
    @Query("SELECT m.sender.firstName, m.sender.lastName, COUNT(m) as cnt " +
            "FROM GroupMessage m " +
            "WHERE m.group.id = :groupId " +
            "AND m.deleted = false " +
            "AND m.createdDate >= :since " +
            "AND m.type = com.example.backend.messaging.enums.MessageType.TEXT " +
            "GROUP BY m.sender.id, m.sender.firstName, m.sender.lastName " +
            "ORDER BY cnt DESC")
    List<Object[]> findTopSpeakersInGroup(
            @Param("groupId") UUID groupId,
            @Param("since") Instant since);
}
