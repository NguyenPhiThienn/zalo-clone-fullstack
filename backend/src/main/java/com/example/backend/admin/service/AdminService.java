package com.example.backend.admin.service;

import com.example.backend.admin.dto.*;
import com.example.backend.user.entity.User;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface AdminService {
    Page<AdminUserDto> getAllUsers(int page, int size);
    AdminUserDto getUserDetail(UUID userId);
    AdminUserDto banUser(UUID userId, User admin, BanRequest req);
    AdminUserDto unbanUser(UUID userId, User admin);
    void deleteUser(UUID userId, User admin);
    AdminUserDto promoteToAdmin(UUID userId, User admin);
    AdminUserDto demoteToUser(UUID userId, User admin);
    AdminUserDto resetPassword(UUID userId, User admin);
    AdminUserDto createAdminAccount(String email, String firstName, String lastName, User admin);
    Page<AdminGroupDto> getAllGroups(int page, int size);
    void deleteGroup(UUID groupId, User admin);
    Page<AuditLogDto> getAuditLogs(int page, int size);
    AdminStatsDto getStats();
}
