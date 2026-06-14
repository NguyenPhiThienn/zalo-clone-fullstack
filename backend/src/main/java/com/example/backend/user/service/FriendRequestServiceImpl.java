package com.example.backend.user.service;

import com.example.backend.messaging.service.NotificationService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.dto.FriendRequestDto;
import com.example.backend.user.dto.UserDto;
import com.example.backend.user.entity.FriendRequest;
import com.example.backend.user.entity.FriendRequestStatus;
import com.example.backend.user.entity.User;
import com.example.backend.user.mapper.UserMapper;
import com.example.backend.user.repository.FriendRequestRepository;
import com.example.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendRequestServiceImpl implements FriendRequestService {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public FriendRequestDto sendFriendRequest(UUID receiverId, Authentication auth) {
        User sender = getCurrentUser(auth);
        if (sender.getId().equals(receiverId)) {
            throw new IllegalArgumentException("Không thể tự gửi lời mời kết bạn cho chính mình");
        }

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        friendRequestRepository.findBetweenUsers(sender.getId(), receiverId).ifPresent(existing -> {
            if (existing.getStatus() == FriendRequestStatus.ACCEPTED) {
                throw new IllegalStateException("Hai người đã là bạn bè");
            }
            if (existing.getStatus() == FriendRequestStatus.PENDING) {
                throw new IllegalStateException("Lời mời kết bạn đã được gửi trước đó");
            }
        });

        FriendRequest request = new FriendRequest();
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setStatus(FriendRequestStatus.PENDING);
        FriendRequest saved = friendRequestRepository.save(request);

        FriendRequestDto dto = toDto(saved);
        notificationService.sendFriendRequestNotification(receiver.getEmail(), dto);
        return dto;
    }

    @Override
    @Caching(evict = {
        @CacheEvict(value = "contacts", key = "#auth.name"),
        @CacheEvict(value = "contacts", key = "#result.senderEmail")
    })
    @Transactional
    public FriendRequestDto acceptFriendRequest(UUID requestId, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời kết bạn không tồn tại"));

        if (!request.getReceiver().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Bạn không có quyền chấp nhận lời mời này");
        }
        if (request.getStatus() != FriendRequestStatus.PENDING) {
            throw new IllegalStateException("Lời mời kết bạn đã được xử lý");
        }

        request.setStatus(FriendRequestStatus.ACCEPTED);
        FriendRequest saved = friendRequestRepository.save(request);

        FriendRequestDto dto = toDto(saved);
        notificationService.sendFriendRequestAcceptedNotification(request.getSender().getEmail(), dto);
        return dto;
    }

    @Override
    @Transactional
    public void rejectFriendRequest(UUID requestId, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời kết bạn không tồn tại"));

        if (!request.getReceiver().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Bạn không có quyền từ chối lời mời này");
        }
        if (request.getStatus() != FriendRequestStatus.PENDING) {
            throw new IllegalStateException("Lời mời kết bạn đã được xử lý");
        }

        friendRequestRepository.delete(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FriendRequestDto> getPendingRequests(Authentication auth) {
        User currentUser = getCurrentUser(auth);
        return friendRequestRepository
                .findByReceiverIdAndStatus(currentUser.getId(), FriendRequestStatus.PENDING)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FriendRequestDto> getSentRequests(Authentication auth) {
        User currentUser = getCurrentUser(auth);
        return friendRequestRepository
                .findBySenderIdAndStatus(currentUser.getId(), FriendRequestStatus.PENDING)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(value = "contacts", key = "#auth.name")
    @Transactional(readOnly = true)
    public List<UserDto> getContacts(Authentication auth) {
        User currentUser = getCurrentUser(auth);

        // Friends via accepted friend requests
        java.util.Set<UUID> addedIds = new java.util.HashSet<>();
        java.util.List<UserDto> contacts = new java.util.ArrayList<>();

        friendRequestRepository.findAcceptedFriendships(currentUser.getId())
                .forEach(fr -> {
                    User friend = fr.getSender().getId().equals(currentUser.getId())
                            ? fr.getReceiver()
                            : fr.getSender();
                    if (addedIds.add(friend.getId())) {
                        UserDto dto = userMapper.toDto(friend);
                        dto.setFriendshipStatus("ACCEPTED");
                        contacts.add(dto);
                    }
                });

        // Admin users always appear in contacts (except self)
        userRepository.findByRole("ADMIN").forEach(admin -> {
            if (!admin.getId().equals(currentUser.getId()) && addedIds.add(admin.getId())) {
                UserDto dto = userMapper.toDto(admin);
                dto.setFriendshipStatus("ACCEPTED");
                contacts.add(dto);
            }
        });

        return contacts;
    }

    @Override
    @CacheEvict(value = "contacts", key = "#auth.name")
    @Transactional
    public void unfriend(UUID friendId, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        FriendRequest request = friendRequestRepository
                .findBetweenUsers(currentUser.getId(), friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Quan hệ bạn bè không tồn tại"));

        if (request.getStatus() != FriendRequestStatus.ACCEPTED) {
            throw new IllegalStateException("Hai người không phải bạn bè");
        }

        friendRequestRepository.delete(request);
    }

    private User getCurrentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));
    }

    private FriendRequestDto toDto(FriendRequest fr) {
        User sender = fr.getSender();
        User receiver = fr.getReceiver();
        return FriendRequestDto.builder()
                .id(fr.getId())
                .senderId(sender.getId())
                .senderName(sender.getFirstName() + " " + (sender.getLastName() != null ? sender.getLastName() : ""))
                .senderEmail(sender.getEmail())
                .senderAvatarUrl(sender.getAvatarUrl())
                .senderOnline(sender.isUserOnline())
                .receiverId(receiver.getId())
                .receiverName(receiver.getFirstName() + " " + (receiver.getLastName() != null ? receiver.getLastName() : ""))
                .receiverEmail(receiver.getEmail())
                .receiverAvatarUrl(receiver.getAvatarUrl())
                .status(fr.getStatus().name())
                .createdDate(fr.getCreatedDate())
                .build();
    }
}
