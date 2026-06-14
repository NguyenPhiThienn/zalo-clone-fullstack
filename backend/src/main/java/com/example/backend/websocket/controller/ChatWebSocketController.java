package com.example.backend.websocket.controller;

import com.example.backend.messaging.service.NotificationService;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Xử lý các sự kiện WebSocket (typing indicator, v.v.)
 * Client gửi tới /app/chat/{chatId}/typing hoặc /app/group/{groupId}/typing
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Nhận sự kiện đang gõ tin nhắn 1-1
     * Client gửi: SEND /app/chat/{chatId}/typing { "typing": true }
     * Server broadcast: /topic/chat/{chatId}/typing
     */
    @MessageMapping("/chat/{chatId}/typing")
    public void handleChatTyping(
            @DestinationVariable UUID chatId,
            @Payload Map<String, Object> payload,
            Principal principal) {

        if (principal == null) return;

        userRepository.findByEmail(principal.getName()).ifPresent(user -> {
            boolean isTyping = Boolean.TRUE.equals(payload.get("typing"));
            log.debug("User {} is {}typing in chat {}", user.getId(), isTyping ? "" : "not ", chatId);
            notificationService.sendTypingNotification(chatId, user.getId(), isTyping);
        });
    }

    /**
     * Nhận sự kiện đang gõ tin nhắn nhóm
     * Client gửi: SEND /app/group/{groupId}/typing { "typing": true }
     * Server broadcast: /topic/group/{groupId}/typing
     */
    @MessageMapping("/group/{groupId}/typing")
    public void handleGroupTyping(
            @DestinationVariable UUID groupId,
            @Payload Map<String, Object> payload,
            Principal principal) {

        if (principal == null) return;

        userRepository.findByEmail(principal.getName()).ifPresent(user -> {
            boolean isTyping = Boolean.TRUE.equals(payload.get("typing"));
            log.debug("User {} is {}typing in group {}", user.getId(), isTyping ? "" : "not ", groupId);
            messagingTemplate.convertAndSend(
                    "/topic/group/" + groupId + "/typing",
                    new NotificationService.TypingPayload(user.getId(), isTyping)
            );
        });
    }
}
