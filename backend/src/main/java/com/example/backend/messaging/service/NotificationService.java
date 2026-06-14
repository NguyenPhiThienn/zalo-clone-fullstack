package com.example.backend.messaging.service;

import com.example.backend.messaging.dto.MessageDto;
import com.example.backend.messaging.enums.MessageState;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.user.dto.FriendRequestDto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NotificationService {
    void sendMessageNotification(String recipientEmail, MessageDto messageDto);
    void sendChatBroadcast(UUID chatId, MessageDto messageDto);
    void sendMessageDeliveredNotification(String senderEmail, UUID chatId);
    void sendMessageSeenNotification(String recipientEmail, UUID chatId);
    void sendTypingNotification(UUID chatId, UUID userId, boolean isTyping);
    void sendUserStatusNotification(UUID userId, boolean isOnline);
    void sendMessageRecalledNotification(String recipientEmail, UUID messageId, UUID chatId);
    void sendReactionNotification(String recipientEmail, UUID messageId, UUID chatId, List<ReactionDto> reactions);
    void sendGroupReactionNotification(String recipientEmail, UUID groupId, String reactorName, String emoji);
    void sendFriendRequestNotification(String receiverEmail, FriendRequestDto dto);
    void sendForceLogout(String email, String reason);
    void sendAccountBanned(String email, String reason, LocalDateTime banUntil);
    void sendFriendRequestAcceptedNotification(String senderEmail, FriendRequestDto dto);
    void sendStateChangeBroadcast(UUID chatId, MessageState newState, UUID messageSenderId);

    record GroupReactionPayload(UUID groupId, String reactorName, String emoji) {}
    record ForceLogoutPayload(String reason) {}
    record MessageDeliveredPayload(UUID chatId) {}
    record MessageSeenPayload(UUID chatId) {}
    record MessageStateChangePayload(UUID chatId, MessageState newState, UUID messageSenderId) {}
    record TypingPayload(UUID userId, boolean isTyping) {}
    record UserStatusPayload(UUID userId, boolean isOnline) {}
    record MessageRecalledPayload(UUID messageId, UUID chatId) {}
    record ReactionEventPayload(UUID messageId, UUID chatId, List<ReactionDto> reactions) {}
}
