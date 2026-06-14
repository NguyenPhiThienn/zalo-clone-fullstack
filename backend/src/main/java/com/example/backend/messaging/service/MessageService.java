package com.example.backend.messaging.service;

import com.example.backend.messaging.dto.MessageDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MessageService {

    MessageDto sendMessage(MessageDto messageDto, Authentication currentUser);

    MessageDto uploadMediaMessage(String chatId, MultipartFile file, Authentication currentUser);

    List<MessageDto> getMessagesByChatId(String chatId, int page, int size, Authentication currentUser);

    void setMessagesToSeen(String chatId, Authentication currentUser);
    void setMessagesToDelivered(String chatId, Authentication currentUser);
    void setAllMessagesToDelivered(Authentication currentUser);
    void recallMessage(UUID messageId, Authentication currentUser);
    void deleteMessageForMe(UUID messageId, Authentication currentUser);
}