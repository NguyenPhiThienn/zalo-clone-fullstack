package com.example.backend.ai.service;

import com.example.backend.ai.dto.SmartReplyResponse;
import com.example.backend.ai.dto.SummarizeResponse;

import java.time.Instant;
import java.util.UUID;

public interface GroupAiService {
    SmartReplyResponse getSmartReplies(UUID groupId);
    SummarizeResponse summarize(UUID groupId, Instant since);
    void handleBotMentionAsync(UUID groupId, String messageContent, String senderName);
}
