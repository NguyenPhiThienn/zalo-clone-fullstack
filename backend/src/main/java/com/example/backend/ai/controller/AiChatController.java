package com.example.backend.ai.controller;

import com.example.backend.ai.dto.AiChatRequest;
import com.example.backend.ai.dto.AiMessageDto;
import com.example.backend.ai.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import com.example.backend.shared.ratelimit.AiRateLimit;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    @AiRateLimit
    @PostMapping("/chat")
    public ResponseEntity<AiMessageDto> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication currentUser) {
        return ResponseEntity.ok(aiChatService.sendMessage(request, currentUser));
    }

    @GetMapping("/history")
    public ResponseEntity<Page<AiMessageDto>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Authentication currentUser) {
        return ResponseEntity.ok(aiChatService.getHistory(page, size, currentUser));
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> clearHistory(Authentication currentUser) {
        aiChatService.clearHistory(currentUser);
        return ResponseEntity.ok().build();
    }
}
