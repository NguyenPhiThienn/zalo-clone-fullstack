package com.example.backend.services;

import com.example.backend.auth.dto.ChangePasswordRequest;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.dto.UpdateProfileRequest;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.FriendRequestStatus;
import com.example.backend.user.entity.User;
import com.example.backend.user.mapper.UserMapper;
import com.example.backend.user.repository.FriendRequestRepository;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.service.BlockService;
import com.example.backend.user.service.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Unit Tests")
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock UserMapper userMapper;
    @Mock FileStorageService fileStorageService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock FriendRequestRepository friendRequestRepository;
    @Mock BlockService blockService;
    @Mock Authentication authentication;

    @InjectMocks UserServiceImpl userService;

    private User self;
    private User other;
    private UserDto selfDto;
    private UserDto otherDto;

    @BeforeEach
    void setUp() {
        self = new User();
        self.setId(UUID.randomUUID());
        self.setEmail("self@gmail.com");
        self.setFirstName("Self");
        self.setLastName("User");
        self.setRole("USER");

        other = new User();
        other.setId(UUID.randomUUID());
        other.setEmail("other@gmail.com");
        other.setFirstName("Other");
        other.setLastName("User");
        other.setRole("USER");

        selfDto = new UserDto();
        otherDto = new UserDto();

        when(authentication.getName()).thenReturn("self@gmail.com");
    }

    // ─── getAllUsersExceptSelf ─────────────────────────────────────────────────

    @Test
    @DisplayName("getAllUsersExceptSelf() - trả về danh sách không có self")
    void getAllUsersExceptSelf_success() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.findByIdNot(self.getId())).thenReturn(List.of(other));
        when(userMapper.toDto(other)).thenReturn(otherDto);

        List<UserDto> result = userService.getAllUsersExceptSelf(authentication);

        assertThat(result).hasSize(1).containsOnly(otherDto);
        verify(userRepository).findByIdNot(self.getId());
    }

    @Test
    @DisplayName("getAllUsersExceptSelf() - user không tồn tại → ResourceNotFoundException")
    void getAllUsersExceptSelf_userNotFound_throws() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getAllUsersExceptSelf(authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getUserById ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getUserById() - xem chính mình → friendshipStatus = SELF")
    void getUserById_self_returnsSelf() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.findById(self.getId())).thenReturn(Optional.of(self));
        when(userMapper.toDto(self)).thenReturn(selfDto);

        UserDto result = userService.getUserById(self.getId(), authentication);

        assertThat(result).isEqualTo(selfDto);
        verify(selfDto, never()); // blockStatus = NONE
    }

    @Test
    @DisplayName("getUserById() - xem người khác chưa là bạn → NONE")
    void getUserById_stranger_none() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.findById(other.getId())).thenReturn(Optional.of(other));
        when(userMapper.toDto(other)).thenReturn(otherDto);
        when(blockService.isBlockedByMe(self.getId(), other.getId())).thenReturn(false);
        when(blockService.isBlockedByMe(other.getId(), self.getId())).thenReturn(false);
        when(friendRequestRepository.findBetweenUsers(self.getId(), other.getId())).thenReturn(Optional.empty());

        UserDto result = userService.getUserById(other.getId(), authentication);

        assertThat(result).isEqualTo(otherDto);
        verify(otherDto).setFriendshipStatus("NONE");
        verify(otherDto).setBlockStatus("NONE");
    }

    @Test
    @DisplayName("getUserById() - đã là bạn bè → ACCEPTED")
    void getUserById_friends_accepted() {
        FriendRequest fr = new FriendRequest();
        fr.setSender(self);
        fr.setReceiver(other);
        fr.setStatus(FriendRequestStatus.ACCEPTED);

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.findById(other.getId())).thenReturn(Optional.of(other));
        when(userMapper.toDto(other)).thenReturn(otherDto);
        when(blockService.isBlockedByMe(self.getId(), other.getId())).thenReturn(false);
        when(blockService.isBlockedByMe(other.getId(), self.getId())).thenReturn(false);
        when(friendRequestRepository.findBetweenUsers(self.getId(), other.getId())).thenReturn(Optional.of(fr));

        userService.getUserById(other.getId(), authentication);

        verify(otherDto).setFriendshipStatus("ACCEPTED");
    }

    @Test
    @DisplayName("getUserById() - mình block người kia → BLOCKED_BY_ME")
    void getUserById_blockedByMe() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.findById(other.getId())).thenReturn(Optional.of(other));
        when(userMapper.toDto(other)).thenReturn(otherDto);
        when(blockService.isBlockedByMe(self.getId(), other.getId())).thenReturn(true);
        when(friendRequestRepository.findBetweenUsers(self.getId(), other.getId())).thenReturn(Optional.empty());

        userService.getUserById(other.getId(), authentication);

        verify(otherDto).setBlockStatus("BLOCKED_BY_ME");
    }

    // ─── getMyProfile ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getMyProfile() - thành công")
    void getMyProfile_success() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userMapper.toDto(self)).thenReturn(selfDto);

        UserDto result = userService.getMyProfile(authentication);

        assertThat(result).isEqualTo(selfDto);
    }

    // ─── searchUsers ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("searchUsers() - tìm thấy kết quả")
    void searchUsers_found() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.searchByNameOrEmail("other", self.getId())).thenReturn(List.of(other));
        when(userMapper.toDto(other)).thenReturn(otherDto);
        when(friendRequestRepository.findBetweenUsers(self.getId(), other.getId())).thenReturn(Optional.empty());
        when(blockService.isBlockedByMe(self.getId(), other.getId())).thenReturn(false);
        when(blockService.isBlockedByMe(other.getId(), self.getId())).thenReturn(false);

        List<UserDto> result = userService.searchUsers("other", authentication);

        assertThat(result).hasSize(1);
        verify(userRepository).searchByNameOrEmail("other", self.getId());
    }

    @Test
    @DisplayName("searchUsers() - không có kết quả")
    void searchUsers_empty() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.searchByNameOrEmail("xyz", self.getId())).thenReturn(List.of());

        List<UserDto> result = userService.searchUsers("xyz", authentication);

        assertThat(result).isEmpty();
    }

    // ─── updateProfile ────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateProfile() - thành công")
    void updateProfile_success() {
        UpdateProfileRequest req = new UpdateProfileRequest("Nguyen", "Van A");

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(userRepository.save(any())).thenReturn(self);
        when(userMapper.toDto(self)).thenReturn(selfDto);

        UserDto result = userService.updateProfile(req, authentication);

        assertThat(result).isEqualTo(selfDto);
        assertThat(self.getFirstName()).isEqualTo("Nguyen");
        assertThat(self.getLastName()).isEqualTo("Van A");
    }

    @Test
    @DisplayName("updateProfile() - user không tồn tại → throw")
    void updateProfile_userNotFound_throws() {
        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile(new UpdateProfileRequest("A", "B"), authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── uploadAvatar ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("uploadAvatar() - file ảnh hợp lệ → thành công")
    void uploadAvatar_success() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("image/jpeg");

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(fileStorageService.saveFile(file)).thenReturn("avatar/uuid.jpg");
        when(userRepository.save(any())).thenReturn(self);
        when(userMapper.toDto(self)).thenReturn(selfDto);

        UserDto result = userService.uploadAvatar(file, authentication);

        assertThat(result).isEqualTo(selfDto);
        assertThat(self.getAvatarUrl()).isEqualTo("avatar/uuid.jpg");
    }

    @Test
    @DisplayName("uploadAvatar() - file rỗng → throw")
    void uploadAvatar_empty_throws() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> userService.uploadAvatar(file, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("trống");
    }

    @Test
    @DisplayName("uploadAvatar() - không phải ảnh → throw")
    void uploadAvatar_notImage_throws() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("application/pdf");

        assertThatThrownBy(() -> userService.uploadAvatar(file, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ảnh");
    }

    // ─── changePassword ───────────────────────────────────────────────────────

    @Test
    @DisplayName("changePassword() - thành công")
    void changePassword_success() {
        self.setPassword("currentHashed");
        ChangePasswordRequest req = new ChangePasswordRequest("currentPass", "newPass");

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("currentPass", "currentHashed")).thenReturn(true);
        when(passwordEncoder.encode("newPass")).thenReturn("newHashed");
        when(userRepository.save(any())).thenReturn(self);

        assertThatNoException().isThrownBy(() -> userService.changePassword(req, authentication));
        assertThat(self.getPassword()).isEqualTo("newHashed");
    }

    @Test
    @DisplayName("changePassword() - mật khẩu hiện tại sai → throw")
    void changePassword_wrongCurrent_throws() {
        self.setPassword("currentHashed");
        ChangePasswordRequest req = new ChangePasswordRequest("wrong", "newPass");

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("wrong", "currentHashed")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword(req, authentication))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("changePassword() - mật khẩu mới trùng cũ → throw")
    void changePassword_sameAsNew_throws() {
        self.setPassword("currentHashed");
        ChangePasswordRequest req = new ChangePasswordRequest("samePass", "samePass");

        when(userRepository.findByEmail("self@gmail.com")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("samePass", "currentHashed")).thenReturn(true);

        assertThatThrownBy(() -> userService.changePassword(req, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("khác");
    }
}
