package com.example.backend.chat.repository;

import com.example.backend.chat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatRepository extends JpaRepository<Chat, UUID> {

    // JOIN FETCH user1 + user2 để tránh N+1 khi build ChatDto
    @Query("SELECT c FROM Chat c " +
           "LEFT JOIN FETCH c.user1 " +
           "LEFT JOIN FETCH c.user2 " +
           "WHERE (c.user1.id = :userId AND c.deletedByUser1 = false) " +
           "OR (c.user2.id = :userId AND c.deletedByUser2 = false) " +
           "ORDER BY c.lastModifiedDate DESC")
    List<Chat> findAllChatsByUserId(@Param("userId") UUID userId);

    @Query("SELECT c FROM Chat c " +
           "WHERE (c.user1.id = :user1Id AND c.user2.id = :user2Id) " +
           "OR (c.user1.id = :user2Id AND c.user2.id = :user1Id)")
    Optional<Chat> findChatBetweenTwoUsers(@Param("user1Id") UUID user1Id, 
                                           @Param("user2Id") UUID user2Id);

    @Query("SELECT c FROM Chat c " +
           "LEFT JOIN FETCH c.user1 " +
           "LEFT JOIN FETCH c.user2 " +
           "WHERE c.id = :chatId")
    Optional<Chat> findChatWithUsersById(@Param("chatId") UUID chatId);


    /**
     * Optimized query to fetch chat list with unread count and last message.
     * Returns a list of Object[] where:
     * [0] Chat entity
     * [1] Unread count (Long)
     * [2] Last message content (String)
     * [3] Last message type (MessageType)
     * [4] Last message time (LocalDateTime)
     */
    @Query("SELECT c, " +
           "(SELECT COUNT(m) FROM Message m WHERE m.chat.id = c.id AND m.sender.id <> :userId AND m.state <> com.example.backend.messaging.enums.MessageState.SEEN), " +
           "(SELECT m.content FROM Message m WHERE m.chat.id = c.id ORDER BY m.createdDate DESC LIMIT 1), " +
           "(SELECT m.type FROM Message m WHERE m.chat.id = c.id ORDER BY m.createdDate DESC LIMIT 1), " +
           "(SELECT m.createdDate FROM Message m WHERE m.chat.id = c.id ORDER BY m.createdDate DESC LIMIT 1) " +
           "FROM Chat c " +
           "LEFT JOIN FETCH c.user1 " +
           "LEFT JOIN FETCH c.user2 " +
           "WHERE (c.user1.id = :userId AND c.deletedByUser1 = false) " +
           "OR (c.user2.id = :userId AND c.deletedByUser2 = false) " +
           "ORDER BY c.lastModifiedDate DESC")
    List<Object[]> findAllChatsWithSummaryByUserId(@Param("userId") UUID userId);
}