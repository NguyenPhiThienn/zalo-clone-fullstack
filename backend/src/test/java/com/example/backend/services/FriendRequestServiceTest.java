package com.example.backend.services;

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
import com.example.backend.user.service.FriendRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FriendRequestService Unit Tests")
class FriendRequestServiceTest {

    @Mock FriendRequestRepository friendRequestRepository;
    @Mock UserRepository userRepository;
    @Mock UserMapper userMapper;
    @Mock NotificationService notificationService;
    @Mock Authentication authentication;

    @InjectMocks FriendRequestServiceImpl friendRequestService;

    private User sender;
    private User receiver;
    private FriendRequest pendingRequest;
    private UUID requestId;

    @BeforeEach
    void setUp() {
        sender = new User();
        sender.setId(UUID.randomUUID());
        sender.setEmail("sender@gmail.com");
        sender.setFirstName("Sender");
        sender.setLastName("User");

        receiver = new User();
        receiver.setId(UUID.randomUUID());
        receiver.setEmail("receiver@gmail.com");
        receiver.setFirstName("Receiver");
        receiver.setLastName("User");

        requestId = UUID.randomUUID();

        pendingRequest = new FriendRequest();
        pendingRequest.setId(requestId);
        pendingRequest.setSender(sender);
        pendingRequest.setReceiver(receiver);
        pendingRequest.setStatus(FriendRequestStatus.PENDING);

        when(authentication.getName()).thenReturn("sender@gmail.com");
    }

    private void mockCurrentUser(User user) {
        when(authentication.getName()).thenReturn(user.getEmail());
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    // ─── sendFriendRequest ────────────────────────────────────────────────────

    @Test
    @DisplayName("sendFriendRequest() - thành công")
    void sendFriendRequest_success() {
        mockCurrentUser(sender);
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.empty());
        when(friendRequestRepository.save(any())).thenReturn(pendingRequest);
        doNothing().when(notificationService).sendFriendRequestNotification(any(), any());

        FriendRequestDto result = friendRequestService.sendFriendRequest(receiver.getId(), authentication);

        assertThat(result).isNotNull();
        verify(friendRequestRepository).save(any(FriendRequest.class));
        verify(notificationService).sendFriendRequestNotification(eq(receiver.getEmail()), any());
    }

    @Test
    @DisplayName("sendFriendRequest() - gửi cho chính mình → throw")
    void sendFriendRequest_toSelf_throws() {
        mockCurrentUser(sender);

        assertThatThrownBy(() -> friendRequestService.sendFriendRequest(sender.getId(), authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("chính mình");
    }

    @Test
    @DisplayName("sendFriendRequest() - đã là bạn → throw")
    void sendFriendRequest_alreadyFriends_throws() {
        mockCurrentUser(sender);
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));

        FriendRequest accepted = new FriendRequest();
        accepted.setSender(sender);
        accepted.setReceiver(receiver);
        accepted.setStatus(FriendRequestStatus.ACCEPTED);

        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.of(accepted));

        assertThatThrownBy(() -> friendRequestService.sendFriendRequest(receiver.getId(), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("bạn bè");
    }

    @Test
    @DisplayName("sendFriendRequest() - đã gửi trước đó → throw")
    void sendFriendRequest_alreadyPending_throws() {
        mockCurrentUser(sender);
        when(userRepository.findById(receiver.getId())).thenReturn(Optional.of(receiver));
        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> friendRequestService.sendFriendRequest(receiver.getId(), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được gửi");
    }

    // ─── acceptFriendRequest ──────────────────────────────────────────────────

    @Test
    @DisplayName("acceptFriendRequest() - thành công")
    void acceptFriendRequest_success() {
        mockCurrentUser(receiver);
        when(friendRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));
        when(friendRequestRepository.save(any())).thenReturn(pendingRequest);
        doNothing().when(notificationService).sendFriendRequestAcceptedNotification(any(), any());

        FriendRequestDto result = friendRequestService.acceptFriendRequest(requestId, authentication);

        assertThat(result).isNotNull();
        assertThat(pendingRequest.getStatus()).isEqualTo(FriendRequestStatus.ACCEPTED);
        verify(notificationService).sendFriendRequestAcceptedNotification(eq(sender.getEmail()), any());
    }

    @Test
    @DisplayName("acceptFriendRequest() - không phải người nhận → UnauthorizedException")
    void acceptFriendRequest_notReceiver_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");
        mockCurrentUser(stranger);

        when(friendRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> friendRequestService.acceptFriendRequest(requestId, authentication))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("acceptFriendRequest() - request đã xử lý → throw")
    void acceptFriendRequest_alreadyProcessed_throws() {
        mockCurrentUser(receiver);
        pendingRequest.setStatus(FriendRequestStatus.ACCEPTED);
        when(friendRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> friendRequestService.acceptFriendRequest(requestId, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("đã được xử lý");
    }

    // ─── rejectFriendRequest ──────────────────────────────────────────────────

    @Test
    @DisplayName("rejectFriendRequest() - thành công")
    void rejectFriendRequest_success() {
        mockCurrentUser(receiver);
        when(friendRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));
        doNothing().when(friendRequestRepository).delete(pendingRequest);

        assertThatNoException().isThrownBy(
                () -> friendRequestService.rejectFriendRequest(requestId, authentication));

        verify(friendRequestRepository).delete(pendingRequest);
    }

    @Test
    @DisplayName("rejectFriendRequest() - không phải người nhận → UnauthorizedException")
    void rejectFriendRequest_notReceiver_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");
        mockCurrentUser(stranger);

        when(friendRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> friendRequestService.rejectFriendRequest(requestId, authentication))
                .isInstanceOf(UnauthorizedException.class);
    }

    // ─── getPendingRequests ───────────────────────────────────────────────────

    @Test
    @DisplayName("getPendingRequests() - trả về danh sách pending")
    void getPendingRequests_success() {
        mockCurrentUser(receiver);
        when(friendRequestRepository.findByReceiverIdAndStatus(receiver.getId(), FriendRequestStatus.PENDING))
                .thenReturn(List.of(pendingRequest));

        List<FriendRequestDto> result = friendRequestService.getPendingRequests(authentication);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getPendingRequests() - không có request → danh sách rỗng")
    void getPendingRequests_empty() {
        mockCurrentUser(receiver);
        when(friendRequestRepository.findByReceiverIdAndStatus(receiver.getId(), FriendRequestStatus.PENDING))
                .thenReturn(List.of());

        List<FriendRequestDto> result = friendRequestService.getPendingRequests(authentication);

        assertThat(result).isEmpty();
    }

    // ─── getSentRequests ──────────────────────────────────────────────────────

    @Test
    @DisplayName("getSentRequests() - trả về danh sách đã gửi")
    void getSentRequests_success() {
        mockCurrentUser(sender);
        when(friendRequestRepository.findBySenderIdAndStatus(sender.getId(), FriendRequestStatus.PENDING))
                .thenReturn(List.of(pendingRequest));

        List<FriendRequestDto> result = friendRequestService.getSentRequests(authentication);

        assertThat(result).hasSize(1);
    }

    // ─── getContacts ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getContacts() - trả về danh sách bạn bè")
    void getContacts_success() {
        mockCurrentUser(sender);

        FriendRequest accepted = new FriendRequest();
        accepted.setSender(sender);
        accepted.setReceiver(receiver);
        accepted.setStatus(FriendRequestStatus.ACCEPTED);

        when(friendRequestRepository.findAcceptedFriendships(sender.getId())).thenReturn(List.of(accepted));
        when(userRepository.findByRole("ADMIN")).thenReturn(List.of());
        when(userMapper.toDto(receiver)).thenReturn(new UserDto());

        List<UserDto> contacts = friendRequestService.getContacts(authentication);

        assertThat(contacts).hasSize(1);
    }

    // ─── unfriend ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("unfriend() - thành công")
    void unfriend_success() {
        mockCurrentUser(sender);
        FriendRequest accepted = new FriendRequest();
        accepted.setSender(sender);
        accepted.setReceiver(receiver);
        accepted.setStatus(FriendRequestStatus.ACCEPTED);

        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.of(accepted));
        doNothing().when(friendRequestRepository).delete(accepted);

        assertThatNoException().isThrownBy(
                () -> friendRequestService.unfriend(receiver.getId(), authentication));

        verify(friendRequestRepository).delete(accepted);
    }

    @Test
    @DisplayName("unfriend() - chưa là bạn → throw")
    void unfriend_notFriends_throws() {
        mockCurrentUser(sender);
        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.of(pendingRequest)); // PENDING, not ACCEPTED

        assertThatThrownBy(() -> friendRequestService.unfriend(receiver.getId(), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("không phải bạn bè");
    }

    @Test
    @DisplayName("unfriend() - không có quan hệ → ResourceNotFoundException")
    void unfriend_noRelation_throws() {
        mockCurrentUser(sender);
        when(friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> friendRequestService.unfriend(receiver.getId(), authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
