package com.example.backend.ai.service;

import com.example.backend.ai.dto.AiChatRequest;
import com.example.backend.ai.dto.AiMessageDto;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

public interface AiChatService {
    AiMessageDto sendMessage(AiChatRequest request, Authentication auth);
    Page<AiMessageDto> getHistory(int page, int size, Authentication auth);
    void clearHistory(Authentication auth);
}
