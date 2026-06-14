package com.example.backend.services;

import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.entity.BlockedUser;
import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.FriendRequestStatus;
import com.example.backend.user.entity.User;
import com.example.backend.user.mapper.UserMapper;
import com.example.backend.user.repository.BlockedUserRepository;
import com.example.backend.user.repository.FriendRequestRepository;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.service.BlockServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BlockService Unit Tests")
class BlockServiceTest {

    @Mock BlockedUserRepository blockedUserRepository;
    @Mock FriendRequestRepository friendRequestRepository;
    @Mock UserRepository userRepository;
    @Mock UserMapper userMapper;

    @InjectMocks BlockServiceImpl blockService;

    private User blocker;
    private User target;

    @BeforeEach
    void setUp() {
        blocker = new User();
        blocker.setId(UUID.randomUUID());
        blocker.setEmail("blocker@gmail.com");
        blocker.setFirstName("Blocker");
        blocker.setLastName("User");

        target = new User();
        target.setId(UUID.randomUUID());
        target.setEmail("target@gmail.com");
        target.setFirstName("Target");
        target.setLastName("User");
    }

    // ─── blockUser ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("blockUser() - lần đầu block → lưu record")
    void blockUser_success() {
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(false);
        when(userRepository.findById(blocker.getId())).thenReturn(Optional.of(blocker));
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(blockedUserRepository.save(any())).thenReturn(new BlockedUser());
        when(friendRequestRepository.findBetweenUsers(blocker.getId(), target.getId())).thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> blockService.blockUser(blocker.getId(), target.getId()));

        verify(blockedUserRepository).save(any(BlockedUser.class));
    }

    @Test
    @DisplayName("blockUser() - đã block rồi → no-op, không lưu lại")
    void blockUser_alreadyBlocked_noop() {
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(true);

        assertThatNoException().isThrownBy(() -> blockService.blockUser(blocker.getId(), target.getId()));

        verify(blockedUserRepository, never()).save(any());
    }

    @Test
    @DisplayName("blockUser() - tự block chính mình → throw")
    void blockUser_self_throws() {
        assertThatThrownBy(() -> blockService.blockUser(blocker.getId(), blocker.getId()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chính mình");
    }

    @Test
    @DisplayName("blockUser() - khi block → xóa friend request nếu có")
    void blockUser_deletesFriendRequest() {
        FriendRequest fr = new FriendRequest();
        fr.setSender(blocker);
        fr.setReceiver(target);
        fr.setStatus(FriendRequestStatus.PENDING);

        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(false);
        when(userRepository.findById(blocker.getId())).thenReturn(Optional.of(blocker));
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(blockedUserRepository.save(any())).thenReturn(new BlockedUser());
        when(friendRequestRepository.findBetweenUsers(blocker.getId(), target.getId()))
                .thenReturn(Optional.of(fr));
        doNothing().when(friendRequestRepository).delete(fr);

        blockService.blockUser(blocker.getId(), target.getId());

        verify(friendRequestRepository).delete(fr);
    }

    @Test
    @DisplayName("blockUser() - target user không tồn tại → ResourceNotFoundException")
    void blockUser_targetNotFound_throws() {
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(false);
        when(userRepository.findById(blocker.getId())).thenReturn(Optional.of(blocker));
        when(userRepository.findById(target.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> blockService.blockUser(blocker.getId(), target.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── unblockUser ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("unblockUser() - tìm thấy record → xóa")
    void unblockUser_success() {
        BlockedUser record = new BlockedUser();
        record.setBlocker(blocker);
        record.setBlocked(target);

        when(blockedUserRepository.findByBlockerIdAndBlockedId(blocker.getId(), target.getId()))
                .thenReturn(Optional.of(record));
        doNothing().when(blockedUserRepository).delete(record);

        assertThatNoException().isThrownBy(() -> blockService.unblockUser(blocker.getId(), target.getId()));

        verify(blockedUserRepository).delete(record);
    }

    @Test
    @DisplayName("unblockUser() - chưa block → no-op")
    void unblockUser_notBlocked_noop() {
        when(blockedUserRepository.findByBlockerIdAndBlockedId(blocker.getId(), target.getId()))
                .thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> blockService.unblockUser(blocker.getId(), target.getId()));

        verify(blockedUserRepository, never()).delete(any());
    }

    // ─── isBlocked ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("isBlocked() - trả về true khi bị block một chiều")
    void isBlocked_true() {
        when(blockedUserRepository.isBlockedBetween(blocker.getId(), target.getId())).thenReturn(true);

        assertThat(blockService.isBlocked(blocker.getId(), target.getId())).isTrue();
    }

    @Test
    @DisplayName("isBlocked() - trả về false khi không block")
    void isBlocked_false() {
        when(blockedUserRepository.isBlockedBetween(blocker.getId(), target.getId())).thenReturn(false);

        assertThat(blockService.isBlocked(blocker.getId(), target.getId())).isFalse();
    }

    // ─── isBlockedByMe ────────────────────────────────────────────────────────

    @Test
    @DisplayName("isBlockedByMe() - trả về true")
    void isBlockedByMe_true() {
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(true);

        assertThat(blockService.isBlockedByMe(blocker.getId(), target.getId())).isTrue();
    }

    @Test
    @DisplayName("isBlockedByMe() - trả về false")
    void isBlockedByMe_false() {
        when(blockedUserRepository.existsByBlockerIdAndBlockedId(blocker.getId(), target.getId())).thenReturn(false);

        assertThat(blockService.isBlockedByMe(blocker.getId(), target.getId())).isFalse();
    }

    // ─── getBlockedUsers ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getBlockedUsers() - trả về danh sách đã block")
    void getBlockedUsers_success() {
        BlockedUser record = new BlockedUser();
        record.setBlocker(blocker);
        record.setBlocked(target);

        UserDto targetDto = new UserDto();
        when(blockedUserRepository.findAllByBlockerId(blocker.getId())).thenReturn(List.of(record));
        when(userMapper.toDto(target)).thenReturn(targetDto);

        List<UserDto> result = blockService.getBlockedUsers(blocker.getId());

        assertThat(result).hasSize(1);
        verify(targetDto).setBlockStatus("BLOCKED_BY_ME");
    }

    @Test
    @DisplayName("getBlockedUsers() - chưa block ai → danh sách rỗng")
    void getBlockedUsers_empty() {
        when(blockedUserRepository.findAllByBlockerId(blocker.getId())).thenReturn(List.of());

        List<UserDto> result = blockService.getBlockedUsers(blocker.getId());

        assertThat(result).isEmpty();
    }
}
