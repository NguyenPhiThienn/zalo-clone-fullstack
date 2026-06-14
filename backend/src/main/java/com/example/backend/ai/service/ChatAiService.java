package com.example.backend.ai.service;

import com.example.backend.ai.dto.SmartReplyResponse;
import com.example.backend.ai.dto.SummarizeResponse;

import java.time.Instant;
import java.util.UUID;

public interface ChatAiService {
    SmartReplyResponse getSmartReplies(UUID chatId);
    SummarizeResponse summarize(UUID chatId, Instant since);
    void handleBotMentionAsync(UUID chatId, String messageContent, String senderName);
}
