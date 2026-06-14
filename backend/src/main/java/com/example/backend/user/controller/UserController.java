package com.example.backend.user.controller;

import com.example.backend.auth.dto.ChangePasswordRequest;
import com.example.backend.user.dto.UpdateProfileRequest;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMyProfile(Authentication currentUser) {
        return ResponseEntity.ok(userService.getMyProfile(currentUser));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication currentUser) {
        return ResponseEntity.ok(userService.updateProfile(request, currentUser));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication currentUser) {
        userService.changePassword(request, currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserDto> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication currentUser) {
        return ResponseEntity.ok(userService.uploadAvatar(file, currentUser));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(
            @PathVariable UUID userId,
            Authentication currentUser) {
        return ResponseEntity.ok(userService.getUserById(userId, currentUser));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam String keyword,
            Authentication currentUser) {
        return ResponseEntity.ok(userService.searchUsers(keyword, currentUser));
    }

    /** Frontend goi moi 60s de refresh Redis TTL, giu trang thai online. */
    @PostMapping("/me/heartbeat")
    public ResponseEntity<Void> heartbeat(Authentication currentUser) {
        userService.heartbeat(currentUser);
        return ResponseEntity.ok().build();
    }
}
