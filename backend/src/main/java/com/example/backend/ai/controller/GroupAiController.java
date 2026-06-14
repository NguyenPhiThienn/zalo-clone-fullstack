package com.example.backend.ai.controller;

import com.example.backend.ai.dto.SmartReplyRequest;
import com.example.backend.ai.dto.SmartReplyResponse;
import com.example.backend.ai.dto.SummarizeRequest;
import com.example.backend.ai.dto.SummarizeResponse;
import com.example.backend.ai.service.GroupAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.example.backend.shared.ratelimit.AiRateLimit;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/group/{groupId}/ai")
@RequiredArgsConstructor
public class GroupAiController {

    private final GroupAiService groupAiService;

    /**
     * Feature 1 — Smart Reply
     * POST /api/v1/group/{groupId}/ai/smart-reply
     * Response: { "suggestions": ["...", "...", "..."] }
     */
    @AiRateLimit
    @PostMapping("/smart-reply")
    public ResponseEntity<SmartReplyResponse> smartReply(
            @PathVariable UUID groupId,
            @RequestBody(required = false) SmartReplyRequest request,
            Authentication auth) {
        return ResponseEntity.ok(groupAiService.getSmartReplies(groupId));
    }

    /**
     * Feature 2 — Message Summarization
     * POST /api/v1/group/{groupId}/ai/summarize
     * Body: { "since": "2026-04-17T14:30:00" }
     */
    @AiRateLimit
    @PostMapping("/summarize")
    public ResponseEntity<SummarizeResponse> summarize(
            @PathVariable UUID groupId,
            @RequestBody SummarizeRequest request,
            Authentication auth) {
        return ResponseEntity.ok(groupAiService.summarize(groupId, request.getSince()));
    }
}
