package com.example.backend.ai.service;

import com.example.backend.ai.entity.AiMessage;
import com.example.backend.ai.dto.AiChatRequest;
import com.example.backend.ai.dto.AiMessageDto;
import com.example.backend.ai.repository.AiMessageRepository;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiChatServiceImpl implements AiChatService {

    private final ChatClient chatClient;
    private final AiMessageRepository aiMessageRepository;
    private final UserRepository userRepository;
    private final com.example.backend.ai.mapper.AiMessageMapper aiMessageMapper;

    @Override
    public AiMessageDto sendMessage(AiChatRequest request, Authentication auth) {
        User user = getUser(auth);

        // Lưu tin nhắn user
        saveUserMessage(user, request.getMessage());

        List<AiMessage> history = aiMessageRepository
                .findTop20ByUserIdOrderByCreatedDateDesc(user.getId());
        Collections.reverse(history);

        // Gọi AI
        String assistantReply = callAi(history);

        // Lưu phản hồi AI
        AiMessage saved = saveAssistantMessage(user, assistantReply);

        return aiMessageMapper.toDto(saved);
    }

    @Transactional
    public void saveUserMessage(User user, String content) {
        AiMessage userMsg = AiMessage.builder()
                .user(user)
                .role("user")
                .content(content)
                .build();
        aiMessageRepository.save(userMsg);
    }

    @Transactional
    public AiMessage saveAssistantMessage(User user, String content) {
        AiMessage assistantMsg = AiMessage.builder()
                .user(user)
                .role("assistant")
                .content(content)
                .build();
        return aiMessageRepository.save(assistantMsg);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AiMessageDto> getHistory(int page, int size, Authentication auth) {
        User user = getUser(auth);
        return aiMessageRepository
                .findByUserIdOrderByCreatedDateAsc(user.getId(), PageRequest.of(page, size))
                .map(aiMessageMapper::toDto);
    }

    @Override
    @Transactional
    public void clearHistory(Authentication auth) {
        User user = getUser(auth);
        aiMessageRepository.deleteByUserId(user.getId());
        log.info("AI chat history cleared for user {}", user.getId());
    }

    @io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker(name = "aiService", fallbackMethod = "callAiFallback")
    private String callAi(List<AiMessage> history) {
        List<Message> messages = history.stream()
                .map(m -> "user".equals(m.getRole())
                        ? (Message) new UserMessage(m.getContent())
                        : (Message) new AssistantMessage(m.getContent()))
                .collect(Collectors.toList());

        return chatClient.prompt()
                .messages(messages)
                .call()
                .content();
    }

    private String callAiFallback(List<AiMessage> history, Throwable t) {
        log.error("AI Circuit Breaker triggered: {}", t.getMessage());
        return "Hệ thống AI đang gặp sự cố hoặc phản hồi chậm. Vui lòng thử lại sau giây lát.";
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
