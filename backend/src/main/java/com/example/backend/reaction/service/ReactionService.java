package com.example.backend.reaction.service;

import com.example.backend.reaction.dto.ReactionDto;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface ReactionService {
    List<ReactionDto> reactToMessage(UUID messageId, String emoji, Authentication auth);
    void removeReactionFromMessage(UUID messageId, Authentication auth);
    List<ReactionDto> getMessageReactions(UUID messageId);
    List<ReactionDto> reactToGroupMessage(UUID groupMessageId, String emoji, Authentication auth);
    void removeReactionFromGroupMessage(UUID groupMessageId, Authentication auth);
    List<ReactionDto> getGroupMessageReactions(UUID groupMessageId);
}
