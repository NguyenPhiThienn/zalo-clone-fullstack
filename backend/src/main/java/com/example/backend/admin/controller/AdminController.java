package com.example.backend.admin.controller;

import com.example.backend.admin.dto.AdminGroupDto;
import com.example.backend.admin.dto.AdminStatsDto;
import com.example.backend.admin.dto.AdminUserDto;
import com.example.backend.admin.dto.AuditLogDto;
import com.example.backend.admin.dto.BanRequest;
import com.example.backend.admin.service.AdminService;
import jakarta.validation.Valid;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Secured("ROLE_ADMIN")
public class AdminController {

    private final AdminService adminService;
    private final UserRepository userRepository;

    // ─── Quản lý User ────────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllUsers(page, size));
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<AdminUserDto> getUserDetail(@PathVariable UUID userId) {
        return ResponseEntity.ok(adminService.getUserDetail(userId));
    }

    @PatchMapping("/users/{userId}/ban")
    public ResponseEntity<AdminUserDto> banUser(
            @PathVariable UUID userId,
            @Valid @RequestBody BanRequest req,
            Authentication auth) {
        return ResponseEntity.ok(adminService.banUser(userId, getAdmin(auth), req));
    }

    @PatchMapping("/users/{userId}/unban")
    public ResponseEntity<AdminUserDto> unbanUser(@PathVariable UUID userId, Authentication auth) {
        return ResponseEntity.ok(adminService.unbanUser(userId, getAdmin(auth)));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId, Authentication auth) {
        adminService.deleteUser(userId, getAdmin(auth));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/users/{userId}/promote")
    public ResponseEntity<AdminUserDto> promoteToAdmin(@PathVariable UUID userId, Authentication auth) {
        return ResponseEntity.ok(adminService.promoteToAdmin(userId, getAdmin(auth)));
    }

    @PatchMapping("/users/{userId}/demote")
    public ResponseEntity<AdminUserDto> demoteToUser(@PathVariable UUID userId, Authentication auth) {
        return ResponseEntity.ok(adminService.demoteToUser(userId, getAdmin(auth)));
    }

    @PatchMapping("/users/{userId}/reset-password")
    public ResponseEntity<AdminUserDto> resetPassword(@PathVariable UUID userId, Authentication auth) {
        return ResponseEntity.ok(adminService.resetPassword(userId, getAdmin(auth)));
    }

    @PostMapping("/accounts")
    public ResponseEntity<AdminUserDto> createAdminAccount(
            @RequestBody Map<String, String> body,
            Authentication auth) {
        return ResponseEntity.ok(adminService.createAdminAccount(
                body.get("email"),
                body.get("firstName"),
                body.get("lastName"),
                getAdmin(auth)
        ));
    }

    // ─── Quản lý Group ───────────────────────────────────────────────────────

    @GetMapping("/groups")
    public ResponseEntity<Page<AdminGroupDto>> getAllGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAllGroups(page, size));
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<Void> deleteGroup(@PathVariable UUID groupId, Authentication auth) {
        adminService.deleteGroup(groupId, getAdmin(auth));
        return ResponseEntity.ok().build();
    }

    // ─── Audit Log ────────────────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.getAuditLogs(page, size));
    }

    // ─── Thống kê ─────────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private User getAdmin(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
    }
}
