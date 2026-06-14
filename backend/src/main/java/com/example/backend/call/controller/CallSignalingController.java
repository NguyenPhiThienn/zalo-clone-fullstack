package com.example.backend.call.controller;

import com.example.backend.call.dto.CallSignalDto;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Optional;

/**
 * Relay WebRTC signaling messages qua STOMP.
 *
 * Client gửi tới:   /app/call/signal
 * Server relay tới: /user/{targetEmail}/queue/call
 *
 * Các loại signal được relay:
 *   call-offer    — gửi đến receiver để hiển thị IncomingCallModal
 *   call-answer   — gửi đến initiator để set remote SDP
 *   call-reject   — gửi đến initiator để đóng offer
 *   call-cancel   — gửi đến receiver để đóng modal
 *   call-end      — gửi đến bên kia để kết thúc cuộc gọi
 *   ice-candidate — trao đổi ICE candidate
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class CallSignalingController {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @MessageMapping("/call/signal")
    public void relaySignal(@Payload CallSignalDto signal, Principal principal) {
        if (principal == null) {
            log.warn("Unauthenticated call signal ignored");
            return;
        }
        if (signal.getTargetUserId() == null) {
            log.warn("Call signal missing targetUserId, ignored");
            return;
        }

        // Điền thông tin sender vào signal
        Optional<User> senderOpt = userRepository.findByEmail(principal.getName());
        if (senderOpt.isEmpty()) {
            log.warn("Sender not found for email: {}", principal.getName());
            return;
        }
        User sender = senderOpt.get();
        signal.setFromUserId(sender.getId());
        signal.setFromUserName(sender.getFirstName() + " " + sender.getLastName());
        signal.setFromUserAvatar(sender.getAvatarUrl());

        // Tra cứu email của target
        Optional<User> targetOpt = userRepository.findById(signal.getTargetUserId());
        if (targetOpt.isEmpty()) {
            log.warn("Target user not found: {}", signal.getTargetUserId());
            return;
        }
        String targetEmail = targetOpt.get().getEmail();

        log.info("[call] Relaying {} from {} to {}", signal.getType(), sender.getId(), signal.getTargetUserId());
        messagingTemplate.convertAndSend("/topic/call/" + signal.getTargetUserId(), signal);
    }
}
