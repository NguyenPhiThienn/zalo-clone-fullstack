package com.example.backend.chat.service;

import com.example.backend.chat.dto.ChatDto;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    List<ChatDto> getChatByReceiverId(Authentication currentUser);
    ChatDto getChatById(UUID chatId, Authentication currentUser);
    ChatDto getOrCreateChat(UUID otherUserId, Authentication currentUser);

    void deleteChat(UUID chatId, Authentication currentUser);
}
