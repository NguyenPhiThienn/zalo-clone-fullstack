package com.example.backend.ai.controller;

import com.example.backend.ai.dto.SmartReplyRequest;
import com.example.backend.ai.dto.SmartReplyResponse;
import com.example.backend.ai.dto.SummarizeRequest;
import com.example.backend.ai.dto.SummarizeResponse;
import com.example.backend.ai.service.ChatAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.example.backend.shared.ratelimit.AiRateLimit;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/{chatId}/ai")
@RequiredArgsConstructor
public class ChatAiController {

    private final ChatAiService chatAiService;

    /**
     * Feature 1 — Smart Reply cho chat 1-1
     * POST /api/v1/chat/{chatId}/ai/smart-reply
     * Response: { "suggestions": ["...", "...", "..."] }
     */
    @AiRateLimit
    @PostMapping("/smart-reply")
    public ResponseEntity<SmartReplyResponse> smartReply(
            @PathVariable UUID chatId,
            @RequestBody(required = false) SmartReplyRequest request,
            Authentication auth) {
        return ResponseEntity.ok(chatAiService.getSmartReplies(chatId));
    }

    /**
     * Feature 2 — Message Summarization cho chat 1-1
     * POST /api/v1/chat/{chatId}/ai/summarize
     * Body: { "since": "2026-04-17T14:30:00" }
     */
    @AiRateLimit
    @PostMapping("/summarize")
    public ResponseEntity<SummarizeResponse> summarize(
            @PathVariable UUID chatId,
            @RequestBody SummarizeRequest request,
            Authentication auth) {
        return ResponseEntity.ok(chatAiService.summarize(chatId, request.getSince()));
    }
}
