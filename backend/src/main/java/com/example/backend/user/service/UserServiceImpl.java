package com.example.backend.user.service;

import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.FriendRequestStatus;
import com.example.backend.user.entity.User;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.user.mapper.UserMapper;
import com.example.backend.auth.dto.ChangePasswordRequest;
import com.example.backend.user.dto.UpdateProfileRequest;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.repository.FriendRequestRepository;
import com.example.backend.shared.service.OnlineStatusService;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.example.backend.file.service.FileStorageService;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final OnlineStatusService onlineStatusService;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final FriendRequestRepository friendRequestRepository;
    private final BlockService blockService;

    @Override
    public List<UserDto> getAllUsersExceptSelf(Authentication currentUser) {
        String email = currentUser.getName();
        User self = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return userRepository.findByIdNot(self.getId())
                .stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public UserDto getUserById(UUID userId, Authentication currentUser) {
        User self = userRepository.findByEmail(currentUser.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserDto dto = userMapper.toDto(target);
        // Set block status
        if (!target.getId().equals(self.getId())) {
            boolean iBlockedThem = blockService.isBlockedByMe(self.getId(), target.getId());
            boolean theyBlockedMe = blockService.isBlockedByMe(target.getId(), self.getId());
            if (iBlockedThem) {
                dto.setBlockStatus("BLOCKED_BY_ME");
            } else if (theyBlockedMe) {
                dto.setBlockStatus("BLOCKED_BY_THEM");
            } else {
                dto.setBlockStatus("NONE");
            }
        } else {
            dto.setBlockStatus("NONE");
        }

        // Set friendship status
        if (target.getId().equals(self.getId())) {
            dto.setFriendshipStatus("SELF");
        } else if (target.isAdmin()) {
            dto.setFriendshipStatus("ACCEPTED");
        } else {
            Optional<FriendRequest> relation = friendRequestRepository.findBetweenUsers(self.getId(), target.getId());
            if (relation.isEmpty()) {
                dto.setFriendshipStatus("NONE");
            } else {
                FriendRequest fr = relation.get();
                if (fr.getStatus() == FriendRequestStatus.ACCEPTED) {
                    dto.setFriendshipStatus("ACCEPTED");
                } else if (fr.getStatus() == FriendRequestStatus.PENDING) {
                    dto.setFriendshipStatus(fr.getSender().getId().equals(self.getId()) ? "PENDING_SENT" : "PENDING_RECEIVED");
                } else {
                    dto.setFriendshipStatus("NONE");
                }
            }
        }
        return dto;
    }

    @Override
    public UserDto getMyProfile(Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return userMapper.toDto(user);
    }

    @Override
    public List<UserDto> searchUsers(String keyword, Authentication currentUser) {
        String email = currentUser.getName();
        User self = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return userRepository.searchByNameOrEmail(keyword, self.getId())
                .stream()
                .map(user -> {
                    UserDto dto = userMapper.toDto(user);
                    // Admin users always appear as accepted
                    if (user.isAdmin()) {
                        dto.setFriendshipStatus("ACCEPTED");
                        return dto;
                    }
                    Optional<FriendRequest> relation = friendRequestRepository
                            .findBetweenUsers(self.getId(), user.getId());
                    if (relation.isEmpty()) {
                        dto.setFriendshipStatus("NONE");
                    } else {
                        FriendRequest fr = relation.get();
                        if (fr.getStatus() == FriendRequestStatus.ACCEPTED) {
                            dto.setFriendshipStatus("ACCEPTED");
                        } else if (fr.getStatus() == FriendRequestStatus.PENDING) {
                            if (fr.getSender().getId().equals(self.getId())) {
                                dto.setFriendshipStatus("PENDING_SENT");
                            } else {
                                dto.setFriendshipStatus("PENDING_RECEIVED");
                            }
                        } else {
                            dto.setFriendshipStatus("NONE");
                        }
                    }
                    boolean blockedByMe = blockService.isBlockedByMe(self.getId(), user.getId());
                    boolean blockedByThem = blockService.isBlockedByMe(user.getId(), self.getId());
                    if (blockedByMe) dto.setBlockStatus("BLOCKED_BY_ME");
                    else if (blockedByThem) dto.setBlockStatus("BLOCKED_BY_THEM");
                    else dto.setBlockStatus("NONE");
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDto updateProfile(UpdateProfileRequest request, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }

        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserDto uploadAvatar(MultipartFile file, Authentication currentUser) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Chỉ chấp nhận file ảnh");
        }

        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String filename = fileStorageService.saveFile(file);
        user.setAvatarUrl(filename);

        return userMapper.toDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Mật khẩu hiện tại không đúng");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public void heartbeat(Authentication currentUser) {
        String email = currentUser.getName();
        userRepository.findByEmail(email).ifPresent(user ->
            onlineStatusService.setOnline(user.getId())
        );
    }
}
