package com.example.backend.services;

import com.example.backend.chat.dto.ChatDto;
import com.example.backend.chat.entity.Chat;
import com.example.backend.chat.mapper.ChatMapper;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.chat.service.ChatServiceImpl;
import com.example.backend.messaging.mapper.MessageMapper;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.service.BlockService;
import com.example.backend.shared.service.OnlineStatusService;
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
@DisplayName("ChatService Unit Tests")
class ChatServiceTest {

    @Mock ChatRepository chatRepository;
    @Mock ChatMapper chatMapper;
    @Mock MessageRepository messageRepository;
    @Mock UserRepository userRepository;
    @Mock MessageMapper messageMapper;
    @Mock BlockService blockService;
    @Mock OnlineStatusService onlineStatusService;
    @Mock Authentication authentication;

    @InjectMocks ChatServiceImpl chatService;

    private User user1;
    private User user2;
    private Chat chat;
    private UUID chatId;
    private ChatDto chatDto;

    @BeforeEach
    void setUp() {
        chatId = UUID.randomUUID();

        user1 = new User();
        user1.setId(UUID.randomUUID());
        user1.setEmail("user1@gmail.com");
        user1.setFirstName("User");
        user1.setLastName("One");
        user1.setOnline(true);

        user2 = new User();
        user2.setId(UUID.randomUUID());
        user2.setEmail("user2@gmail.com");
        user2.setFirstName("User");
        user2.setLastName("Two");
        user2.setOnline(false);

        chat = new Chat();
        chat.setId(chatId);
        chat.setUser1(user1);
        chat.setUser2(user2);

        chatDto = new ChatDto();

        when(authentication.getName()).thenReturn("user1@gmail.com");
    }

    private void stubChatMapping(Chat c, ChatDto dto) {
        lenient().when(chatMapper.toDto(c)).thenReturn(dto);
        lenient().when(messageRepository.countUnreadMessages(any(), any())).thenReturn(0);
        lenient().when(messageRepository.findTop1ByChatIdOrderByCreatedDateDesc(any())).thenReturn(Optional.empty());
        lenient().when(blockService.isBlockedByMe(any(), any())).thenReturn(false);
        lenient().when(onlineStatusService.isOnline(any())).thenReturn(false);
    }

    // ─── getChatByReceiverId ──────────────────────────────────────────────────

    @Test
    @DisplayName("getChatByReceiverId() - trả về danh sách chat")
    void getChatByReceiverId_success() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        Object[] summary = new Object[] {
            chat,
            0L,
            "Hello",
            com.example.backend.messaging.enums.MessageType.TEXT,
            java.time.Instant.now()
        };
        List<Object[]> summaryList = java.util.Collections.singletonList(summary);
        when(chatRepository.findAllChatsWithSummaryByUserId(user1.getId())).thenReturn(summaryList);
        stubChatMapping(chat, chatDto);

        List<ChatDto> result = chatService.getChatByReceiverId(authentication);

        assertThat(result).hasSize(1).containsOnly(chatDto);
    }

    @Test
    @DisplayName("getChatByReceiverId() - user không tồn tại → throw")
    void getChatByReceiverId_userNotFound_throws() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getChatByReceiverId(authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── getChatById ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getChatById() - thành công")
    void getChatById_success() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        stubChatMapping(chat, chatDto);

        ChatDto result = chatService.getChatById(chatId, authentication);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("getChatById() - chat không tồn tại → ResourceNotFoundException")
    void getChatById_notFound_throws() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(chatRepository.findById(chatId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getChatById(chatId, authentication))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Chat not found");
    }

    @Test
    @DisplayName("getChatById() - không phải thành viên → UnauthorizedException")
    void getChatById_accessDenied_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");

        when(authentication.getName()).thenReturn("stranger@gmail.com");
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.of(stranger));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatService.getChatById(chatId, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Access denied");
    }

    // ─── getOrCreateChat ──────────────────────────────────────────────────────

    @Test
    @DisplayName("getOrCreateChat() - tạo chat mới")
    void getOrCreateChat_createsNew() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2.getId())).thenReturn(Optional.of(user2));
        when(chatRepository.findChatBetweenTwoUsers(user1.getId(), user2.getId())).thenReturn(Optional.empty());
        when(chatRepository.save(any())).thenReturn(chat);
        stubChatMapping(chat, chatDto);

        ChatDto result = chatService.getOrCreateChat(user2.getId(), authentication);

        assertThat(result).isNotNull();
        verify(chatRepository).save(any(Chat.class));
    }

    @Test
    @DisplayName("getOrCreateChat() - chat đã tồn tại → trả về chat cũ")
    void getOrCreateChat_returnsExisting() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2.getId())).thenReturn(Optional.of(user2));
        when(chatRepository.findChatBetweenTwoUsers(user1.getId(), user2.getId())).thenReturn(Optional.of(chat));
        stubChatMapping(chat, chatDto);

        chatService.getOrCreateChat(user2.getId(), authentication);

        verify(chatRepository, never()).save(any());
    }

    @Test
    @DisplayName("getOrCreateChat() - chat với chính mình → throw")
    void getOrCreateChat_withSelf_throws() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));

        assertThatThrownBy(() -> chatService.getOrCreateChat(user1.getId(), authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("yourself");
    }

    @Test
    @DisplayName("getOrCreateChat() - người kia không tồn tại → ResourceNotFoundException")
    void getOrCreateChat_otherNotFound_throws() {
        UUID nonExistentId = UUID.randomUUID();
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(userRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getOrCreateChat(nonExistentId, authentication))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ─── deleteChat ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteChat() - user1 xóa → soft-delete user1")
    void deleteChat_byUser1_softDelete() {
        when(userRepository.findByEmail("user1@gmail.com")).thenReturn(Optional.of(user1));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(chatRepository.save(any())).thenReturn(chat);

        chatService.deleteChat(chatId, authentication);

        assertThat(chat.isDeletedByUser1()).isTrue();
        assertThat(chat.getDeletedAtByUser1()).isNotNull();
        assertThat(chat.isDeletedByUser2()).isFalse();
    }

    @Test
    @DisplayName("deleteChat() - user2 xóa → soft-delete user2")
    void deleteChat_byUser2_softDelete() {
        when(authentication.getName()).thenReturn("user2@gmail.com");
        when(userRepository.findByEmail("user2@gmail.com")).thenReturn(Optional.of(user2));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(chatRepository.save(any())).thenReturn(chat);

        chatService.deleteChat(chatId, authentication);

        assertThat(chat.isDeletedByUser2()).isTrue();
        assertThat(chat.isDeletedByUser1()).isFalse();
    }

    @Test
    @DisplayName("deleteChat() - không phải thành viên → throw")
    void deleteChat_notMember_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");

        when(authentication.getName()).thenReturn("stranger@gmail.com");
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.of(stranger));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatService.deleteChat(chatId, authentication))
                .isInstanceOf(UnauthorizedException.class);
    }
}
