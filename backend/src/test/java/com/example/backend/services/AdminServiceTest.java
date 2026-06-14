package com.example.backend.services;

import com.example.backend.admin.dto.AdminGroupDto;
import com.example.backend.admin.dto.AdminStatsDto;
import com.example.backend.admin.dto.AdminUserDto;
import com.example.backend.admin.dto.BanRequest;
import com.example.backend.admin.entity.AuditLog;
import com.example.backend.admin.mapper.AdminMapper;
import com.example.backend.admin.repository.AuditLogRepository;
import com.example.backend.admin.service.AdminServiceImpl;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.group.entity.Group;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.group.repository.GroupRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService Unit Tests")
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock MessageRepository messageRepository;
    @Mock GroupMessageRepository groupMessageRepository;
    @Mock GroupRepository groupRepository;
    @Mock ChatRepository chatRepository;
    @Mock AuditLogRepository auditLogRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock NotificationService notificationService;
    @Mock AdminMapper adminMapper;

    @InjectMocks AdminServiceImpl adminService;

    private User targetUser;
    private User adminUser;
    private Group testGroup;

    @BeforeEach
    void setUp() {
        targetUser = new User();
        targetUser.setId(UUID.randomUUID());
        targetUser.setEmail("target@gmail.com");
        targetUser.setFirstName("Target");
        targetUser.setLastName("User");
        targetUser.setRole("USER");
        targetUser.setBanned(false);
        targetUser.setEmailVerified(true);
        targetUser.setOnline(false);

        adminUser = new User();
        adminUser.setId(UUID.randomUUID());
        adminUser.setEmail("admin@gmail.com");
        adminUser.setFirstName("Admin");
        adminUser.setLastName("User");
        adminUser.setRole("ADMIN");

        testGroup = new Group();
        testGroup.setId(UUID.randomUUID());
        testGroup.setName("Test Group");
        testGroup.setCreatedBy(adminUser);
        testGroup.setMembers(new ArrayList<>());

        lenient().when(auditLogRepository.save(any())).thenReturn(new AuditLog());
        lenient().when(adminMapper.toUserDto(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return AdminUserDto.builder()
                    .id(u.getId())
                    .email(u.getEmail())
                    .firstName(u.getFirstName())
                    .lastName(u.getLastName())
                    .role(u.getRole())
                    .banned(u.isBanned())
                    .build();
        });
        lenient().when(adminMapper.toGroupDto(any())).thenAnswer(inv -> {
            Group g = inv.getArgument(0);
            return AdminGroupDto.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .build();
        });
    }

    // ─── getAllUsers ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllUsers() - phân trang thành công")
    void getAllUsers_success() {
        Page<User> page = new PageImpl<>(List.of(targetUser, adminUser));
        when(userRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<AdminUserDto> result = adminService.getAllUsers(0, 10);

        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    // ─── getUserDetail ────────────────────────────────────────────────────────

    @Test
    @DisplayName("getUserDetail() - tìm thấy user")
    void getUserDetail_success() {
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));

        AdminUserDto result = adminService.getUserDetail(targetUser.getId());

        assertThat(result.getEmail()).isEqualTo("target@gmail.com");
    }

    @Test
    @DisplayName("getUserDetail() - user không tồn tại → throw")
    void getUserDetail_notFound_throws() {
        UUID fakeId = UUID.randomUUID();
        when(userRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.getUserDetail(fakeId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── banUser ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("banUser() - ban tạm thời thành công")
    void banUser_temporaryBan_success() {
        BanRequest req = BanRequest.builder()
                .reason("Vi phạm nội dung")
                .durationDays(7)
                .build();

        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenReturn(targetUser);
        doNothing().when(notificationService).sendAccountBanned(any(), any(), any());

        AdminUserDto result = adminService.banUser(targetUser.getId(), adminUser, req);

        assertThat(result).isNotNull();
        assertThat(targetUser.isBanned()).isTrue();
        assertThat(targetUser.getBanReason()).isEqualTo("Vi phạm nội dung");
        assertThat(targetUser.getBanUntil()).isNotNull();
        verify(notificationService).sendAccountBanned(eq(targetUser.getEmail()), any(), any());
    }

    @Test
    @DisplayName("banUser() - ban vĩnh viễn (durationDays = null)")
    void banUser_permanentBan_success() {
        BanRequest req = BanRequest.builder()
                .reason("Vi phạm nghiêm trọng")
                .durationDays(null)
                .build();

        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenReturn(targetUser);
        doNothing().when(notificationService).sendAccountBanned(any(), any(), any());

        adminService.banUser(targetUser.getId(), adminUser, req);

        assertThat(targetUser.isBanned()).isTrue();
        assertThat(targetUser.getBanUntil()).isNull();
    }

    // ─── unbanUser ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("unbanUser() - unban thành công")
    void unbanUser_success() {
        targetUser.setBanned(true);
        targetUser.setBanReason("Test");

        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenReturn(targetUser);

        AdminUserDto result = adminService.unbanUser(targetUser.getId(), adminUser);

        assertThat(result).isNotNull();
        assertThat(targetUser.isBanned()).isFalse();
        assertThat(targetUser.getBanReason()).isNull();
    }

    // ─── deleteUser ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteUser() - soft-delete thành công")
    void deleteUser_success() {
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenReturn(targetUser);

        assertThatNoException().isThrownBy(() -> adminService.deleteUser(targetUser.getId(), adminUser));

        assertThat(targetUser.getRole()).isEqualTo("DELETED");
        assertThat(targetUser.isBanned()).isTrue();
    }

    // ─── promoteToAdmin ───────────────────────────────────────────────────────

    @Test
    @DisplayName("promoteToAdmin() - thành công")
    void promoteToAdmin_success() {
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenReturn(targetUser);

        AdminUserDto result = adminService.promoteToAdmin(targetUser.getId(), adminUser);

        assertThat(result).isNotNull();
        assertThat(targetUser.getRole()).isEqualTo("ADMIN");
    }

    // ─── demoteToUser ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("demoteToUser() - thành công")
    void demoteToUser_success() {
        adminUser.setRole("ADMIN");
        when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));
        when(userRepository.save(any())).thenReturn(adminUser);

        AdminUserDto result = adminService.demoteToUser(adminUser.getId(), adminUser);

        assertThat(result).isNotNull();
        assertThat(adminUser.getRole()).isEqualTo("USER");
    }

    // ─── resetPassword ────────────────────────────────────────────────────────

    @Test
    @DisplayName("resetPassword() - đặt lại về mật khẩu mặc định")
    void resetPassword_success() {
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(passwordEncoder.encode("Reset@1234")).thenReturn("hashedDefault");
        when(userRepository.save(any())).thenReturn(targetUser);

        AdminUserDto result = adminService.resetPassword(targetUser.getId(), adminUser);

        assertThat(result).isNotNull();
        assertThat(targetUser.getPassword()).isEqualTo("hashedDefault");
    }

    // ─── createAdminAccount ───────────────────────────────────────────────────

    @Test
    @DisplayName("createAdminAccount() - tạo admin mới thành công")
    void createAdminAccount_success() {
        when(userRepository.existsByEmail("newadmin@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("Admin@1234")).thenReturn("hashedAdmin");
        when(userRepository.save(any())).thenReturn(adminUser);

        AdminUserDto result = adminService.createAdminAccount(
                "newadmin@gmail.com", "New", "Admin", adminUser);

        assertThat(result).isNotNull();
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("createAdminAccount() - email đã tồn tại → throw")
    void createAdminAccount_duplicateEmail_throws() {
        when(userRepository.existsByEmail("existing@gmail.com")).thenReturn(true);

        assertThatThrownBy(() -> adminService.createAdminAccount(
                "existing@gmail.com", "Test", "User", adminUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email đã tồn tại");
    }

    // ─── getAllGroups ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllGroups() - phân trang thành công")
    void getAllGroups_success() {
        Page<Group> page = new PageImpl<>(List.of(testGroup));
        when(groupRepository.findAll(any(Pageable.class))).thenReturn(page);

        Page<AdminGroupDto> result = adminService.getAllGroups(0, 10);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ─── deleteGroup ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteGroup() - xóa group thành công")
    void deleteGroup_success() {
        when(groupRepository.findById(testGroup.getId())).thenReturn(Optional.of(testGroup));
        doNothing().when(groupRepository).delete(testGroup);

        assertThatNoException().isThrownBy(
                () -> adminService.deleteGroup(testGroup.getId(), adminUser));

        verify(groupRepository).delete(testGroup);
    }

    @Test
    @DisplayName("deleteGroup() - group không tồn tại → ResourceNotFoundException")
    void deleteGroup_notFound_throws() {
        UUID fakeId = UUID.randomUUID();
        when(groupRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deleteGroup(fakeId, adminUser))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getStats ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getStats() - trả về AdminStatsDto")
    void getStats_success() {
        when(userRepository.count()).thenReturn(10L);
        when(groupRepository.count()).thenReturn(3L);
        when(chatRepository.count()).thenReturn(20L);
        when(userRepository.countByOnlineTrue()).thenReturn(2L);
        when(userRepository.countByBannedTrue()).thenReturn(1L);
        when(userRepository.countByEmailVerifiedTrue()).thenReturn(8L);
        when(messageRepository.countByDeletedFalse()).thenReturn(100L);
        when(groupMessageRepository.countByDeletedFalse()).thenReturn(50L);
        when(messageRepository.countDailyMessages(any())).thenReturn(List.of());
        when(groupMessageRepository.countDailyGroupMessages(any())).thenReturn(List.of());
        when(userRepository.countDailyNewUsers(any())).thenReturn(List.of());
        when(groupRepository.countDailyNewGroups(any())).thenReturn(List.of());
        when(messageRepository.findTopSenderIds(any())).thenReturn(List.of());
        when(groupMessageRepository.findTopGroupSenderIds(any())).thenReturn(List.of());

        AdminStatsDto result = adminService.getStats();

        assertThat(result.getTotalUsers()).isEqualTo(10L);
        assertThat(result.getTotalGroups()).isEqualTo(3L);
        assertThat(result.getTotalChats()).isEqualTo(20L);
        assertThat(result.getTotalMessages()).isEqualTo(150L);
        assertThat(result.getOnlineUsers()).isEqualTo(2L);
        assertThat(result.getBannedUsers()).isEqualTo(1L);
    }
}
