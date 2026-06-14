package com.example.backend.user.service;

import com.example.backend.user.dto.FriendRequestDto;
import com.example.backend.user.dto.UserDto;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface FriendRequestService {

    FriendRequestDto sendFriendRequest(UUID receiverId, Authentication auth);

    FriendRequestDto acceptFriendRequest(UUID requestId, Authentication auth);

    void rejectFriendRequest(UUID requestId, Authentication auth);

    List<FriendRequestDto> getPendingRequests(Authentication auth);

    List<FriendRequestDto> getSentRequests(Authentication auth);

    List<UserDto> getContacts(Authentication auth);

    void unfriend(UUID friendId, Authentication auth);
}
