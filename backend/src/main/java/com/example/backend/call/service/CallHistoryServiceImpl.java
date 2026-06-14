package com.example.backend.call.service;

import com.example.backend.call.dto.CallSessionDto;
import com.example.backend.call.dto.StartCallRequest;
import com.example.backend.call.entity.CallSession;
import com.example.backend.call.entity.CallSession.CallStatus;
import com.example.backend.call.entity.CallSession.CallType;
import com.example.backend.call.repository.CallSessionRepository;
import com.example.backend.chat.entity.Chat;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CallHistoryServiceImpl implements CallHistoryService {

    private final CallSessionRepository callSessionRepository;
    private final ChatRepository chatRepository;
    private final UserRepository userRepository;
    private final com.example.backend.call.mapper.CallMapper callMapper;

    @Override
    @Transactional
    public CallSessionDto saveCallSession(UUID initiatorId, StartCallRequest req) {
        Chat chat = chatRepository.findById(req.getChatId())
            .orElseThrow(() -> new RuntimeException("Chat not found: " + req.getChatId()));

        User initiator = userRepository.findById(initiatorId)
            .orElseThrow(() -> new RuntimeException("User not found: " + initiatorId));

        User receiver = userRepository.findById(req.getReceiverId())
            .orElseThrow(() -> new RuntimeException("User not found: " + req.getReceiverId()));

        CallSession session = CallSession.builder()
            .chat(chat)
            .initiator(initiator)
            .receiver(receiver)
            .callType(CallType.valueOf(req.getCallType()))
            .status(CallStatus.valueOf(req.getStatus()))
            .durationSec(req.getDurationSec())
            .startedAt(LocalDateTime.now())
            .endedAt(req.getDurationSec() != null ? LocalDateTime.now() : null)
            .build();

        CallSession saved = callSessionRepository.save(session);
        return callMapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CallSessionDto> getCallHistory(UUID chatId) {
        return callSessionRepository
            .findByChatIdOrderByStartedAtDesc(chatId)
            .stream()
            .map(callMapper::toDto)
            .toList();
    }
}
