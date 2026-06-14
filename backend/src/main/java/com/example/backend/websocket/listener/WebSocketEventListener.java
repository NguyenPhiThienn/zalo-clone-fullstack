package com.example.backend.websocket.listener;

import com.example.backend.shared.service.OnlineStatusService;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.messaging.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final OnlineStatusService onlineStatusService;

    @EventListener
    @Transactional
    public void handleWebSocketConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String email = extractEmail(accessor);
        if (email == null) return;

        userRepository.findByEmail(email).ifPresent(user -> {
            // Cap nhat lastSeen trong DB (khong can setOnline - dung Redis)
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);

            onlineStatusService.setOnline(user.getId());

            log.info("User CONNECTED: {}", email);
            notificationService.sendUserStatusNotification(user.getId(), true);
        });
    }

    @EventListener
    @Transactional
    public void handleWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String email = extractEmail(accessor);
        if (email == null) return;

        userRepository.findByEmail(email).ifPresent(user -> {
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);

            onlineStatusService.setOffline(user.getId());

            log.info("User DISCONNECTED: {} - last seen: {}", email, user.getLastSeen());
            notificationService.sendUserStatusNotification(user.getId(), false);
        });
    }

    private String extractEmail(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            return auth.getName(); // getName() = email (set trong WebSocketConfig)
        }
        return null;
    }
}
