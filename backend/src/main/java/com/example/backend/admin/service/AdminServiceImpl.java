package com.example.backend.admin.service;

import com.example.backend.admin.dto.*;
import com.example.backend.admin.entity.AuditLog;
import com.example.backend.admin.repository.AuditLogRepository;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.group.entity.Group;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.group.repository.GroupRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final GroupRepository groupRepository;
    private final ChatRepository chatRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final com.example.backend.admin.mapper.AdminMapper adminMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<AdminUserDto> getAllUsers(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size, Sort.by("createdDate").descending()))
                .map(adminMapper::toUserDto);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserDto getUserDetail(UUID userId) {
        return adminMapper.toUserDto(getUser(userId));
    }

    @Override
    @Transactional
    public AdminUserDto banUser(UUID userId, User admin, BanRequest req) {
        User user = getUser(userId);
        user.setBanned(true);
        user.setBanReason(req.getReason());
        user.setBannedAt(LocalDateTime.now());
        user.setBanUntil(req.getDurationDays() != null
                ? LocalDateTime.now().plusDays(req.getDurationDays()) : null);
        userRepository.save(user);
        String details = "Lý do: " + req.getReason() +
                (req.getDurationDays() != null ? " | Thời hạn: " + req.getDurationDays() + " ngày" : " | Vĩnh viễn");
        logAction(admin, "BAN_USER", "USER", user.getId(), getFullName(user), details);
        log.info("User {} banned by {} — reason: {}", userId, admin.getEmail(), req.getReason());
        notificationService.sendAccountBanned(user.getEmail(), req.getReason(), user.getBanUntil());
        return adminMapper.toUserDto(user);
    }

    @Override
    @Transactional
    public AdminUserDto unbanUser(UUID userId, User admin) {
        User user = getUser(userId);
        user.setBanned(false);
        user.setBanReason(null);
        user.setBanUntil(null);
        user.setBannedAt(null);
        userRepository.save(user);
        logAction(admin, "UNBAN_USER", "USER", user.getId(), getFullName(user), null);
        log.info("User {} unbanned by {}", userId, admin.getEmail());
        return adminMapper.toUserDto(user);
    }

    @Override
    @Transactional
    public void deleteUser(UUID userId, User admin) {
        User user = getUser(userId);
        logAction(admin, "DELETE_USER", "USER", user.getId(), getFullName(user), "Email: " + user.getEmail());
        user.setRole("DELETED");
        user.setBanned(true);
        userRepository.save(user);
        log.info("User {} soft-deleted by {}", userId, admin.getEmail());
    }

    @Override
    @Transactional
    public AdminUserDto promoteToAdmin(UUID userId, User admin) {
        User user = getUser(userId);
        user.setRole("ADMIN");
        userRepository.save(user);
        logAction(admin, "PROMOTE", "USER", user.getId(), getFullName(user), "Promoted to ADMIN");
        log.info("User {} promoted to ADMIN by {}", userId, admin.getEmail());
        return adminMapper.toUserDto(user);
    }

    @Override
    @Transactional
    public AdminUserDto demoteToUser(UUID userId, User admin) {
        User user = getUser(userId);
        user.setRole("USER");
        userRepository.save(user);
        logAction(admin, "DEMOTE", "USER", user.getId(), getFullName(user), "Demoted to USER");
        log.info("User {} demoted to USER by {}", userId, admin.getEmail());
        return adminMapper.toUserDto(user);
    }

    @Override
    @Transactional
    public AdminUserDto resetPassword(UUID userId, User admin) {
        User user = getUser(userId);
        String defaultPassword = "Reset@1234";
        user.setPassword(passwordEncoder.encode(defaultPassword));
        userRepository.save(user);
        logAction(admin, "RESET_PASSWORD", "USER", user.getId(), getFullName(user), "Password reset to default");
        log.info("Password reset for user {} by {}", userId, admin.getEmail());
        return adminMapper.toUserDto(user);
    }

    @Override
    @Transactional
    public AdminUserDto createAdminAccount(String email, String firstName, String lastName, User admin) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email đã tồn tại: " + email);
        }
        User newAdmin = User.builder()
                .email(email)
                .password(passwordEncoder.encode("Admin@1234"))
                .firstName(firstName)
                .lastName(lastName != null ? lastName : "")
                .role("ADMIN")
                .banned(false)
                .emailVerified(true)
                .online(false)
                .lastSeen(LocalDateTime.now())
                .build();
        userRepository.save(newAdmin);
        logAction(admin, "CREATE_ADMIN", "USER", newAdmin.getId(), getFullName(newAdmin), "Email: " + email);
        log.info("New admin account created: {} by {}", email, admin.getEmail());
        return adminMapper.toUserDto(newAdmin);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AdminGroupDto> getAllGroups(int page, int size) {
        return groupRepository.findAll(PageRequest.of(page, size, Sort.by("createdDate").descending()))
                .map(adminMapper::toGroupDto);
    }

    @Override
    @Transactional
    public void deleteGroup(UUID groupId, User admin) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
        logAction(admin, "DELETE_GROUP", "GROUP", group.getId(), group.getName(), null);
        groupRepository.delete(group);
        log.info("Group {} deleted by {}", groupId, admin.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogDto> getAuditLogs(int page, int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(adminMapper::toAuditLogDto);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminStatsDto getStats() {
        long totalUsers    = userRepository.count();
        long totalGroups   = groupRepository.count();
        long totalChats    = chatRepository.count();
        long onlineUsers   = userRepository.countByOnlineTrue();
        long bannedUsers   = userRepository.countByBannedTrue();
        long verifiedUsers = userRepository.countByEmailVerifiedTrue();
        long totalMessages = messageRepository.countByDeletedFalse()
                           + groupMessageRepository.countByDeletedFalse();

        Instant since = Instant.now().minus(30, java.time.temporal.ChronoUnit.DAYS);

        // Daily messages: merge 1-1 và group
        Map<String, Long> dailyMsgMap = new TreeMap<>();
        messageRepository.countDailyMessages(since).forEach(row -> {
            String date = row[0].toString().substring(0, 10);
            dailyMsgMap.merge(date, ((Number) row[1]).longValue(), Long::sum);
        });
        groupMessageRepository.countDailyGroupMessages(since).forEach(row -> {
            String date = row[0].toString().substring(0, 10);
            dailyMsgMap.merge(date, ((Number) row[1]).longValue(), Long::sum);
        });

        List<AdminStatsDto.DailyCountDto> dailyCounts = toDailyList(dailyMsgMap);

        // Daily new users
        Map<String, Long> dailyUserMap = new TreeMap<>();
        userRepository.countDailyNewUsers(since).forEach(row -> {
            String date = row[0].toString().substring(0, 10);
            dailyUserMap.put(date, ((Number) row[1]).longValue());
        });
        List<AdminStatsDto.DailyCountDto> dailyNewUsers = toDailyList(dailyUserMap);

        // Daily new groups
        Map<String, Long> dailyGroupMap = new TreeMap<>();
        groupRepository.countDailyNewGroups(since).forEach(row -> {
            String date = row[0].toString().substring(0, 10);
            dailyGroupMap.put(date, ((Number) row[1]).longValue());
        });
        List<AdminStatsDto.DailyCountDto> dailyNewGroups = toDailyList(dailyGroupMap);

        // Top active users
        Map<UUID, Long> msgCountMap = new HashMap<>();
        messageRepository.findTopSenderIds(PageRequest.of(0, 50)).forEach(row -> {
            UUID uid = UUID.fromString(row[0].toString());
            msgCountMap.merge(uid, ((Number) row[1]).longValue(), Long::sum);
        });
        groupMessageRepository.findTopGroupSenderIds(PageRequest.of(0, 50)).forEach(row -> {
            UUID uid = UUID.fromString(row[0].toString());
            msgCountMap.merge(uid, ((Number) row[1]).longValue(), Long::sum);
        });

        List<UUID> topIds = msgCountMap.entrySet().stream()
                .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<UUID, User> userMap = userRepository.findByIdIn(topIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<AdminStatsDto.TopUserDto> topUsers = topIds.stream()
                .filter(userMap::containsKey)
                .map(uid -> AdminStatsDto.TopUserDto.builder()
                        .userId(uid)
                        .fullName(getFullName(userMap.get(uid)))
                        .messageCount(msgCountMap.get(uid))
                        .build())
                .collect(Collectors.toList());

        return AdminStatsDto.builder()
                .totalUsers(totalUsers)
                .totalMessages(totalMessages)
                .totalGroups(totalGroups)
                .totalChats(totalChats)
                .onlineUsers(onlineUsers)
                .bannedUsers(bannedUsers)
                .verifiedUsers(verifiedUsers)
                .dailyMessageCounts(dailyCounts)
                .dailyNewUsers(dailyNewUsers)
                .dailyNewGroups(dailyNewGroups)
                .topActiveUsers(topUsers)
                .build();
    }

    private void logAction(User admin, String action, String targetType, UUID targetId, String targetName, String details) {
        AuditLog log = AuditLog.builder()
                .admin(admin)
                .adminEmail(admin.getEmail())
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .targetName(targetName)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    private List<AdminStatsDto.DailyCountDto> toDailyList(Map<String, Long> map) {
        return map.entrySet().stream()
                .map(e -> AdminStatsDto.DailyCountDto.builder()
                        .date(e.getKey())
                        .count(e.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private String getFullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }
}
