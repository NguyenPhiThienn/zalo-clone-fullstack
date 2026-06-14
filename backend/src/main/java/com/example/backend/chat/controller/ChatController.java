package com.example.backend.chat.controller;

import com.example.backend.chat.dto.ChatDto;
import com.example.backend.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat")
public class ChatController {
    private final ChatService chatService;

    @GetMapping
    public ResponseEntity<List<ChatDto>> getAllChats(Authentication currentUser) {
        return ResponseEntity.ok(chatService.getChatByReceiverId(currentUser));
    }

    @GetMapping("/{chatId}")
    public ResponseEntity<ChatDto> getChatById(@PathVariable UUID chatId, Authentication currentUser) {
        return ResponseEntity.ok(chatService.getChatById(chatId, currentUser));
    }

    @PostMapping("/start/{otherUserId}")
    public ResponseEntity<ChatDto> startChat(@PathVariable UUID otherUserId, Authentication currentUser) {
        return ResponseEntity.ok(chatService.getOrCreateChat(otherUserId, currentUser));
    }

    @DeleteMapping("/{chatId}")
    public ResponseEntity<Void> deleteChat(@PathVariable UUID chatId, Authentication currentUser) {
        chatService.deleteChat(chatId, currentUser);
        return ResponseEntity.ok().build();
    }
}
