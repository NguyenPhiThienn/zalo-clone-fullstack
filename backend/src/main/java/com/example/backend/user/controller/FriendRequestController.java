package com.example.backend.user.controller;

import com.example.backend.user.dto.FriendRequestDto;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.service.FriendRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/friend-request")
@RequiredArgsConstructor
public class FriendRequestController {

    private final FriendRequestService friendRequestService;

    @PostMapping("/send/{receiverId}")
    public ResponseEntity<FriendRequestDto> sendFriendRequest(
            @PathVariable UUID receiverId,
            Authentication auth) {
        return ResponseEntity.ok(friendRequestService.sendFriendRequest(receiverId, auth));
    }

    @PostMapping("/{requestId}/accept")
    public ResponseEntity<FriendRequestDto> acceptFriendRequest(
            @PathVariable UUID requestId,
            Authentication auth) {
        return ResponseEntity.ok(friendRequestService.acceptFriendRequest(requestId, auth));
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<Void> rejectFriendRequest(
            @PathVariable UUID requestId,
            Authentication auth) {
        friendRequestService.rejectFriendRequest(requestId, auth);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/pending")
    public ResponseEntity<List<FriendRequestDto>> getPendingRequests(Authentication auth) {
        return ResponseEntity.ok(friendRequestService.getPendingRequests(auth));
    }

    @GetMapping("/sent")
    public ResponseEntity<List<FriendRequestDto>> getSentRequests(Authentication auth) {
        return ResponseEntity.ok(friendRequestService.getSentRequests(auth));
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<UserDto>> getContacts(Authentication auth) {
        return ResponseEntity.ok(friendRequestService.getContacts(auth));
    }

    @DeleteMapping("/unfriend/{friendId}")
    public ResponseEntity<Void> unfriend(
            @PathVariable UUID friendId,
            Authentication auth) {
        friendRequestService.unfriend(friendId, auth);
        return ResponseEntity.ok().build();
    }
}
