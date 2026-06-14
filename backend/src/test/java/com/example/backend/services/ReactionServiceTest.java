package com.example.backend.services;

import com.example.backend.chat.entity.Chat;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.group.entity.Group;
import com.example.backend.group.entity.GroupMember;
import com.example.backend.group.entity.GroupMessage;
import com.example.backend.group.entity.GroupMessageReaction;
import com.example.backend.group.repository.GroupMessageReactionRepository;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.entity.MessageReaction;
import com.example.backend.messaging.repository.MessageReactionRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.reaction.service.ReactionService;
import com.example.backend.reaction.service.ReactionServiceImpl;
import com.example.backend.messaging.mapper.ReactionMapper;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReactionService Unit Tests")
class ReactionServiceTest {

    @Mock MessageReactionRepository messageReactionRepository;
    @Mock GroupMessageReactionRepository groupMessageReactionRepository;
    @Mock MessageRepository messageRepository;
    @Mock GroupMessageRepository groupMessageRepository;
    @Mock UserRepository userRepository;
    @Mock ChatRepository chatRepository;
    @Mock NotificationService notificationService;
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock ReactionMapper reactionMapper;
    @Mock Authentication authentication;

    @InjectMocks ReactionServiceImpl reactionService;

    private User user1;
    private User user2;
    private Chat chat;
    private Message message;
    private Group group;
    private GroupMessage groupMessage;
    private UUID messageId;
    private UUID groupMessageId;

    @BeforeEach
    void setUp() {
        messageId = UUID.randomUUID();
        groupMessageId = UUID.randomUUID();

        user1 = new User();
        user1.setId(UUID.randomUUID());
        user1.setEmail("user1@gmail.com");
        user1.setFirstName("User");
        user1.setLastName("One");

        user2 = new User();
        user2.setId(UUID.randomUUID());
        user2.setEmail("user2@gmail.com");
        user2.setFirstName("User");
        user2.setLastName("Two");

        chat = new Chat();
        chat.setId(UUID.randomUUID());
        chat.setUser1(user1);
        chat.setUser2(user2);

        message = new Message();
        message.setId(messageId);
        message.setChat(chat);
        message.setSender(user1);
        message.setContent("Hello");

        group = new Group();
        group.setId(UUID.randomUUID());
        group.setName("Test Group");
        group.setCreatedBy(user1);
        group.setMembers(new ArrayList<>(List.of(
                GroupMember.of(group, user1, true),
                GroupMember.of(group, user2, false)
        )));

        groupMessage = new GroupMessage();
        groupMessage.setId(groupMessageId);
        groupMessage.setGroup(group);
        groupMessage.setSender(user1);
        groupMessage.setContent("Group Hello");

        ReactionDto reactionDto = new ReactionDto();
        reactionDto.setEmoji("👍");
        lenient().when(reactionMapper.toDto(any())).thenReturn(reactionDto);

        lenient().when(authentication.getName()).thenReturn("user1@gmail.com");
        lenient().when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
    }

    // ─── reactToMessage ───────────────────────────────────────────────────────

    @Test
    @DisplayName("reactToMessage() - react mới thành công")
    void reactToMessage_newReaction_success() {
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));
        when(messageReactionRepository.findByMessageIdAndUserId(messageId, user1.getId()))
                .thenReturn(Optional.empty());
        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(List.of());

        List<ReactionDto> result = reactionService.reactToMessage(messageId, "👍", authentication);

        assertThat(result).isNotNull();
        verify(messageReactionRepository).save(any(MessageReaction.class));
        verify(notificationService).sendReactionNotification(eq(user2.getEmail()), eq(messageId), any(), any());
    }

    @Test
    @DisplayName("reactToMessage() - cùng emoji → toggle off (xóa)")
    void reactToMessage_sameEmoji_togglesOff() {
        MessageReaction existing = new MessageReaction();
        existing.setId(UUID.randomUUID());
        existing.setMessage(message);
        existing.setUser(user1);
        existing.setEmoji("👍");

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));
        when(messageReactionRepository.findByMessageIdAndUserId(messageId, user1.getId()))
                .thenReturn(Optional.of(existing));
        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(List.of());

        reactionService.reactToMessage(messageId, "👍", authentication);

        verify(messageReactionRepository).delete(existing);
        verify(messageReactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("reactToMessage() - emoji khác → cập nhật")
    void reactToMessage_differentEmoji_updates() {
        MessageReaction existing = new MessageReaction();
        existing.setId(UUID.randomUUID());
        existing.setMessage(message);
        existing.setUser(user1);
        existing.setEmoji("👍");

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));
        when(messageReactionRepository.findByMessageIdAndUserId(messageId, user1.getId()))
                .thenReturn(Optional.of(existing));
        when(messageReactionRepository.save(any())).thenReturn(existing);
        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(List.of());

        reactionService.reactToMessage(messageId, "❤️", authentication);

        assertThat(existing.getEmoji()).isEqualTo("❤️");
        verify(messageReactionRepository).save(existing);
    }

    @Test
    @DisplayName("reactToMessage() - không phải thành viên chat → UnauthorizedException")
    void reactToMessage_notMember_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");

        when(authentication.getName()).thenReturn("stranger@gmail.com");
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.of(stranger));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));

        assertThatThrownBy(() -> reactionService.reactToMessage(messageId, "👍", authentication))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("reactToMessage() - message không tồn tại → ResourceNotFoundException")
    void reactToMessage_messageNotFound_throws() {
        when(messageRepository.findById(messageId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reactionService.reactToMessage(messageId, "👍", authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── removeReactionFromMessage ────────────────────────────────────────────

    @Test
    @DisplayName("removeReactionFromMessage() - xóa thành công")
    void removeReactionFromMessage_success() {
        assertThatNoException().isThrownBy(
                () -> reactionService.removeReactionFromMessage(messageId, authentication));

        verify(messageReactionRepository).deleteByMessageIdAndUserId(messageId, user1.getId());
    }

    // ─── getMessageReactions ─────────────────────────────────────────────────

    @Test
    @DisplayName("getMessageReactions() - trả về danh sách reaction")
    void getMessageReactions_success() {
        MessageReaction reaction = new MessageReaction();
        reaction.setId(UUID.randomUUID());
        reaction.setMessage(message);
        reaction.setUser(user1);
        reaction.setEmoji("👍");

        when(messageReactionRepository.findByMessageId(messageId)).thenReturn(List.of(reaction));

        List<ReactionDto> result = reactionService.getMessageReactions(messageId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmoji()).isEqualTo("👍");
    }

    // ─── reactToGroupMessage ─────────────────────────────────────────────────

    @Test
    @DisplayName("reactToGroupMessage() - react mới thành công")
    void reactToGroupMessage_success() {
        when(groupMessageRepository.findById(groupMessageId)).thenReturn(Optional.of(groupMessage));
        when(groupMessageReactionRepository.findByGroupMessageIdAndUserId(groupMessageId, user1.getId()))
                .thenReturn(Optional.empty());
        when(groupMessageReactionRepository.findByGroupMessageId(groupMessageId)).thenReturn(List.of());

        List<ReactionDto> result = reactionService.reactToGroupMessage(groupMessageId, "🔥", authentication);

        assertThat(result).isNotNull();
        verify(groupMessageReactionRepository).save(any(GroupMessageReaction.class));
        verify(messagingTemplate).convertAndSend(
                eq("/topic/group/" + group.getId()), any(ReactionServiceImpl.ReactionGroupEvent.class));
    }

    @Test
    @DisplayName("reactToGroupMessage() - không phải thành viên nhóm → UnauthorizedException")
    void reactToGroupMessage_notMember_throws() {
        User outsider = new User();
        outsider.setId(UUID.randomUUID());
        outsider.setEmail("outsider@gmail.com");

        when(authentication.getName()).thenReturn("outsider@gmail.com");
        when(userRepository.findByEmail("outsider@gmail.com")).thenReturn(Optional.of(outsider));
        when(groupMessageRepository.findById(groupMessageId)).thenReturn(Optional.of(groupMessage));

        assertThatThrownBy(() -> reactionService.reactToGroupMessage(groupMessageId, "🔥", authentication))
                .isInstanceOf(UnauthorizedException.class);
    }

    // ─── removeReactionFromGroupMessage ──────────────────────────────────────

    @Test
    @DisplayName("removeReactionFromGroupMessage() - xóa thành công")
    void removeReactionFromGroupMessage_success() {
        assertThatNoException().isThrownBy(
                () -> reactionService.removeReactionFromGroupMessage(groupMessageId, authentication));

        verify(groupMessageReactionRepository).deleteByGroupMessageIdAndUserId(groupMessageId, user1.getId());
    }

    // ─── getGroupMessageReactions ─────────────────────────────────────────────

    @Test
    @DisplayName("getGroupMessageReactions() - trả về danh sách")
    void getGroupMessageReactions_success() {
        GroupMessageReaction reaction = new GroupMessageReaction();
        reaction.setId(UUID.randomUUID());
        reaction.setGroupMessage(groupMessage);
        reaction.setUser(user1);
        reaction.setEmoji("❤️");

        when(groupMessageReactionRepository.findByGroupMessageId(groupMessageId)).thenReturn(List.of(reaction));

        List<ReactionDto> result = reactionService.getGroupMessageReactions(groupMessageId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmoji()).isEqualTo("❤️");
    }
}
