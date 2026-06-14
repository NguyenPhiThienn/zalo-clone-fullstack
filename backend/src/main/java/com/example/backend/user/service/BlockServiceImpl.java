package com.example.backend.user.service;

import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.entity.BlockedUser;
import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.User;
import com.example.backend.user.mapper.UserMapper;
import com.example.backend.user.repository.BlockedUserRepository;
import com.example.backend.user.repository.FriendRequestRepository;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlockServiceImpl implements BlockService {

    private final BlockedUserRepository blockedUserRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final CacheManager cacheManager;

    @Override
    @Transactional
    public void blockUser(UUID blockerId, UUID targetId) {
        if (blockerId.equals(targetId)) {
            throw new IllegalArgumentException("Không thể tự block chính mình");
        }
        if (blockedUserRepository.existsByBlockerIdAndBlockedId(blockerId, targetId)) {
            return; // đã block rồi
        }
        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User blocked = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BlockedUser blockRecord = new BlockedUser();
        blockRecord.setBlocker(blocker);
        blockRecord.setBlocked(blocked);
        blockedUserRepository.save(blockRecord);

        // Xóa friend request giữa 2 người nếu có
        Optional<FriendRequest> existing = friendRequestRepository.findBetweenUsers(blockerId, targetId);
        existing.ifPresent(friendRequestRepository::delete);
        // Xoa cache contacts cua ca 2 phia
        evictContacts(blocker.getEmail());
        evictContacts(blocked.getEmail());
    }

    @Override
    @Transactional
    public void unblockUser(UUID blockerId, UUID targetId) {
        blockedUserRepository.findByBlockerIdAndBlockedId(blockerId, targetId)
                .ifPresent(blockedUserRepository::delete);
        userRepository.findById(blockerId).ifPresent(u -> evictContacts(u.getEmail()));
        userRepository.findById(targetId).ifPresent(u -> evictContacts(u.getEmail()));
    }

    @Override
    public boolean isBlocked(UUID u1, UUID u2) {
        return blockedUserRepository.isBlockedBetween(u1, u2);
    }

    @Override
    public boolean isBlockedByMe(UUID blockerId, UUID targetId) {
        return blockedUserRepository.existsByBlockerIdAndBlockedId(blockerId, targetId);
    }

    @Override
    public List<UserDto> getBlockedUsers(UUID userId) {
        return blockedUserRepository.findAllByBlockerId(userId)
                .stream()
                .map(bu -> {
                    UserDto dto = userMapper.toDto(bu.getBlocked());
                    dto.setBlockStatus("BLOCKED_BY_ME");
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private void evictContacts(String email) {
        var cache = cacheManager.getCache("contacts");
        if (cache != null) cache.evict(email);
    }
}
