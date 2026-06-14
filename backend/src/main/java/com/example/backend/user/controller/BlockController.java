package com.example.backend.user.controller;

import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.service.BlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/block")
@RequiredArgsConstructor
public class BlockController {

    private final BlockService blockService;
    private final UserRepository userRepository;

    @PostMapping("/{userId}")
    public ResponseEntity<Void> blockUser(@PathVariable UUID userId, Authentication currentUser) {
        UUID selfId = getSelfId(currentUser);
        blockService.blockUser(selfId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unblockUser(@PathVariable UUID userId, Authentication currentUser) {
        UUID selfId = getSelfId(currentUser);
        blockService.unblockUser(selfId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getBlockedUsers(Authentication currentUser) {
        UUID selfId = getSelfId(currentUser);
        return ResponseEntity.ok(blockService.getBlockedUsers(selfId));
    }

    private UUID getSelfId(Authentication currentUser) {
        return userRepository.findByEmail(currentUser.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"))
                .getId();
    }
}
