package com.example.backend.messaging.service;

import com.example.backend.messaging.dto.MessageDto;
import com.example.backend.messaging.enums.MessageState;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.user.dto.FriendRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void sendMessageNotification(String recipientEmail, MessageDto messageDto) {
        log.info("Sending message notification to user: {}", recipientEmail);
        messagingTemplate.convertAndSendToUser(
                recipientEmail,
                "/queue/messages",
                messageDto
        );
    }

    @Override
    public void sendChatBroadcast(UUID chatId, MessageDto messageDto) {
        log.info("Broadcasting message in chat: {}", chatId);
        messagingTemplate.convertAndSend(
                "/topic/chat/" + chatId,
                messageDto
        );
    }

    @Override
    public void sendMessageDeliveredNotification(String senderEmail, UUID chatId) {
        log.debug("Sending delivery report to {} for chat {}", senderEmail, chatId);
        messagingTemplate.convertAndSendToUser(
                senderEmail,
                "/queue/delivered",
                new MessageDeliveredPayload(chatId)
        );
    }

    @Override
    public void sendMessageSeenNotification(String recipientEmail, UUID chatId) {
        log.debug("Sending seen report to {} for chat {}", recipientEmail, chatId);
        messagingTemplate.convertAndSendToUser(
                recipientEmail,
                "/queue/seen",
                new MessageSeenPayload(chatId)
        );
    }

    @Override
    public void sendTypingNotification(UUID chatId, UUID userId, boolean isTyping) {
        log.debug("User {} is {}typing in chat {}", userId, isTyping ? "" : "not ", chatId);
        messagingTemplate.convertAndSend(
                "/topic/chat/" + chatId + "/typing",
                new TypingPayload(userId, isTyping)
        );
    }

    @Override
    public void sendUserStatusNotification(UUID userId, boolean isOnline) {
        log.info("User {} is now {}", userId, isOnline ? "online" : "offline");
        messagingTemplate.convertAndSend(
                "/topic/user/" + userId + "/status",
                new UserStatusPayload(userId, isOnline)
        );
    }

    @Override
    public void sendMessageRecalledNotification(String recipientEmail, UUID messageId, UUID chatId) {
        log.info("Sending message recalled notification to user: {} for message: {}", recipientEmail, messageId);
        messagingTemplate.convertAndSendToUser(
                recipientEmail,
                "/queue/message-recalled",
                new MessageRecalledPayload(messageId, chatId)
        );
    }

    @Override
    public void sendReactionNotification(String recipientEmail, UUID messageId, UUID chatId, List<ReactionDto> reactions) {
        messagingTemplate.convertAndSendToUser(
                recipientEmail,
                "/queue/reactions",
                new ReactionEventPayload(messageId, chatId, reactions)
        );
    }

    @Override
    public void sendGroupReactionNotification(String recipientEmail, UUID groupId, String reactorName, String emoji) {
        messagingTemplate.convertAndSendToUser(
                recipientEmail,
                "/queue/group-reactions",
                new GroupReactionPayload(groupId, reactorName, emoji)
        );
    }

    @Override
    public void sendFriendRequestNotification(String receiverEmail, FriendRequestDto dto) {
        log.info("Sending friend request notification to user: {}", receiverEmail);
        messagingTemplate.convertAndSendToUser(
                receiverEmail,
                "/queue/friend-request",
                dto
        );
    }

    @Override
    public void sendForceLogout(String email, String reason) {
        log.info("Sending force-logout to user: {} — reason: {}", email, reason);
        messagingTemplate.convertAndSendToUser(
                email,
                "/queue/force-logout",
                new ForceLogoutPayload(reason)
        );
    }

    @Override
    public void sendAccountBanned(String email, String reason, LocalDateTime banUntil) {
        log.info("Sending account-banned notification to user: {} — reason: {}", email, reason);
        messagingTemplate.convertAndSendToUser(
                email,
                "/queue/force-logout",
                Map.of(
                    "reason", "ACCOUNT_BANNED",
                    "banReason", reason != null ? reason : "",
                    "banUntil", banUntil != null ? banUntil.toString() : ""
                )
        );
    }

    @Override
    public void sendFriendRequestAcceptedNotification(String senderEmail, FriendRequestDto dto) {
        log.info("Sending friend request accepted notification to user: {}", senderEmail);
        messagingTemplate.convertAndSendToUser(
                senderEmail,
                "/queue/friend-request-accepted",
                dto
        );
    }

    @Override
    public void sendStateChangeBroadcast(UUID chatId, MessageState newState, UUID messageSenderId) {
        log.debug("Broadcasting state change to chat {}: {} for sender {}", chatId, newState, messageSenderId);
        messagingTemplate.convertAndSend("/topic/chat/" + chatId,
                new MessageStateChangePayload(chatId, newState, messageSenderId));
    }
}
