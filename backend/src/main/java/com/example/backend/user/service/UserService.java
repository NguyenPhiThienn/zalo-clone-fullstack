package com.example.backend.user.service;

import com.example.backend.auth.dto.ChangePasswordRequest;
import com.example.backend.user.dto.UpdateProfileRequest;
import com.example.backend.user.dto.UserDto;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface UserService {
    List<UserDto> getAllUsersExceptSelf(Authentication currentUser);

    UserDto getUserById(UUID userId, Authentication currentUser);

    UserDto getMyProfile(Authentication currentUser);

    List<UserDto> searchUsers(String keyword, Authentication currentUser);

    UserDto updateProfile(UpdateProfileRequest request, Authentication currentUser);

    UserDto uploadAvatar(MultipartFile file, Authentication currentUser);

    void changePassword(ChangePasswordRequest request, Authentication currentUser);

    void heartbeat(Authentication currentUser);
}