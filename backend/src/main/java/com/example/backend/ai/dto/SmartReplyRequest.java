package com.example.backend.ai.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class SmartReplyRequest {
    /** ID của tin nhắn cần gợi ý trả lời (optional — nếu null thì lấy tin nhắn mới nhất) */
    private UUID replyToMessageId;
}
