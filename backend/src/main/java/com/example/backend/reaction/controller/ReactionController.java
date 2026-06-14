package com.example.backend.reaction.controller;

import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.reaction.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;

    // ─── Reaction tin nhắn 1-1 ───────────────────────────────────────────────

    @PostMapping("/message/{messageId}/reactions")
    public ResponseEntity<List<ReactionDto>> reactToMessage(
            @PathVariable UUID messageId,
            @RequestParam String emoji,
            Authentication currentUser) {
        return ResponseEntity.ok(reactionService.reactToMessage(messageId, emoji, currentUser));
    }

    @DeleteMapping("/message/{messageId}/reactions")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID messageId,
            Authentication currentUser) {
        reactionService.removeReactionFromMessage(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/message/{messageId}/reactions")
    public ResponseEntity<List<ReactionDto>> getMessageReactions(@PathVariable UUID messageId) {
        return ResponseEntity.ok(reactionService.getMessageReactions(messageId));
    }

    // ─── Reaction tin nhắn nhóm ──────────────────────────────────────────────

    @PostMapping("/group-message/{messageId}/reactions")
    public ResponseEntity<List<ReactionDto>> reactToGroupMessage(
            @PathVariable UUID messageId,
            @RequestParam String emoji,
            Authentication currentUser) {
        return ResponseEntity.ok(reactionService.reactToGroupMessage(messageId, emoji, currentUser));
    }

    @DeleteMapping("/group-message/{messageId}/reactions")
    public ResponseEntity<Void> removeGroupReaction(
            @PathVariable UUID messageId,
            Authentication currentUser) {
        reactionService.removeReactionFromGroupMessage(messageId, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/group-message/{messageId}/reactions")
    public ResponseEntity<List<ReactionDto>> getGroupMessageReactions(@PathVariable UUID messageId) {
        return ResponseEntity.ok(reactionService.getGroupMessageReactions(messageId));
    }
}
