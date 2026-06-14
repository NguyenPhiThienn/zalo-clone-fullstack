package com.example.backend.services;

import com.example.backend.chat.entity.Chat;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.messaging.dto.MessageDto;
import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.enums.MessageState;
import com.example.backend.messaging.enums.MessageType;
import com.example.backend.messaging.mapper.MessageMapper;
import com.example.backend.messaging.repository.MessageReactionRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.messaging.service.MessageServiceImpl;
import com.example.backend.messaging.service.NotificationService;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.user.entity.User;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.user.service.BlockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MessageService Unit Tests")
class MessageServiceTest {

    @Mock MessageRepository messageRepository;
    @Mock ChatRepository chatRepository;
    @Mock MessageMapper messageMapper;
    @Mock FileStorageService fileStorageService;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock MessageReactionRepository messageReactionRepository;
    @Mock BlockService blockService;
    @Mock Authentication authentication;
    @Mock CacheManager cacheManager;
    @Mock com.example.backend.messaging.mapper.ReactionMapper reactionMapper;

    @InjectMocks MessageServiceImpl messageService;

    private User sender;
    private User receiver;
    private Chat chat;
    private UUID chatId;
    private UUID messageId;

    @BeforeEach
    void setUp() {
        chatId = UUID.randomUUID();
        messageId = UUID.randomUUID();

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

        chat = new Chat();
        chat.setId(chatId);
        chat.setUser1(sender);
        chat.setUser2(receiver);

        when(authentication.getName()).thenReturn("sender@gmail.com");
    }

    // ─── sendMessage ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("sendMessage() - TEXT thành công")
    void sendMessage_text_success() {
        MessageDto dto = new MessageDto();
        dto.setChatId(chatId);
        dto.setContent("Xin chào!");
        dto.setType(MessageType.TEXT);

        Message savedMsg = new Message();
        savedMsg.setId(UUID.randomUUID());
        savedMsg.setContent("Xin chào!");
        savedMsg.setType(MessageType.TEXT);
        savedMsg.setState(MessageState.SENT);
        savedMsg.setChat(chat);
        savedMsg.setSender(sender);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(false);
        when(messageRepository.save(any())).thenReturn(savedMsg);
        when(messageMapper.toDto(savedMsg)).thenReturn(dto);

        MessageDto result = messageService.sendMessage(dto, authentication);

        assertThat(result).isNotNull();
        verify(messageRepository).save(any(Message.class));
        verify(notificationService).sendMessageNotification(eq(receiver.getEmail()), any());
        verify(notificationService).sendChatBroadcast(eq(chatId), any());
    }

    @Test
    @DisplayName("sendMessage() - nội dung rỗng → throw")
    void sendMessage_emptyContent_throws() {
        MessageDto dto = new MessageDto();
        dto.setChatId(chatId);
        dto.setContent("   ");
        dto.setType(MessageType.TEXT);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(false);

        assertThatThrownBy(() -> messageService.sendMessage(dto, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be empty");
    }

    @Test
    @DisplayName("sendMessage() - chat không tồn tại → ResourceNotFoundException")
    void sendMessage_chatNotFound_throws() {
        MessageDto dto = new MessageDto();
        dto.setChatId(chatId);
        dto.setContent("Hello");
        dto.setType(MessageType.TEXT);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.sendMessage(dto, authentication))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Chat not found");
    }

    @Test
    @DisplayName("sendMessage() - không phải thành viên → UnauthorizedException")
    void sendMessage_notMember_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");

        when(authentication.getName()).thenReturn("stranger@gmail.com");
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.of(stranger));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        MessageDto dto = new MessageDto();
        dto.setChatId(chatId);
        dto.setContent("Hello");
        dto.setType(MessageType.TEXT);

        assertThatThrownBy(() -> messageService.sendMessage(dto, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("sendMessage() - bị block → UnauthorizedException")
    void sendMessage_blocked_throws() {
        MessageDto dto = new MessageDto();
        dto.setChatId(chatId);
        dto.setContent("Hello");
        dto.setType(MessageType.TEXT);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(true);

        assertThatThrownBy(() -> messageService.sendMessage(dto, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("bị chặn");
    }

    // ─── uploadMediaMessage ───────────────────────────────────────────────────

    @Test
    @DisplayName("uploadMediaMessage() - ảnh → type IMAGE")
    void uploadMedia_image_success() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getContentType()).thenReturn("image/jpeg");
        when(file.getOriginalFilename()).thenReturn("photo.jpg");

        Message savedMsg = new Message();
        savedMsg.setId(UUID.randomUUID());
        savedMsg.setType(MessageType.IMAGE);
        savedMsg.setChat(chat);
        savedMsg.setSender(sender);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(false);
        when(fileStorageService.saveFile(file)).thenReturn("uploads/photo.jpg");
        when(messageRepository.save(any())).thenReturn(savedMsg);
        when(messageMapper.toDto(savedMsg)).thenReturn(new MessageDto());

        assertThatNoException().isThrownBy(
                () -> messageService.uploadMediaMessage(chatId.toString(), file, authentication));

        verify(fileStorageService).saveFile(file);
    }

    @Test
    @DisplayName("uploadMediaMessage() - video → type VIDEO")
    void uploadMedia_video_success() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getContentType()).thenReturn("video/mp4");
        when(file.getOriginalFilename()).thenReturn("video.mp4");

        Message savedMsg = new Message();
        savedMsg.setId(UUID.randomUUID());
        savedMsg.setType(MessageType.VIDEO);
        savedMsg.setChat(chat);
        savedMsg.setSender(sender);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(false);
        when(fileStorageService.saveFile(file)).thenReturn("uploads/video.mp4");
        when(messageRepository.save(any())).thenReturn(savedMsg);
        when(messageMapper.toDto(savedMsg)).thenReturn(new MessageDto());

        assertThatNoException().isThrownBy(
                () -> messageService.uploadMediaMessage(chatId.toString(), file, authentication));
    }

    @Test
    @DisplayName("uploadMediaMessage() - audio → type AUDIO")
    void uploadMedia_audio_success() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getContentType()).thenReturn("audio/mpeg");
        when(file.getOriginalFilename()).thenReturn("audio.mp3");

        Message savedMsg = new Message();
        savedMsg.setId(UUID.randomUUID());
        savedMsg.setType(MessageType.AUDIO);
        savedMsg.setChat(chat);
        savedMsg.setSender(sender);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(blockService.isBlocked(sender.getId(), receiver.getId())).thenReturn(false);
        when(fileStorageService.saveFile(file)).thenReturn("uploads/audio.mp3");
        when(messageRepository.save(any())).thenReturn(savedMsg);
        when(messageMapper.toDto(savedMsg)).thenReturn(new MessageDto());

        assertThatNoException().isThrownBy(
                () -> messageService.uploadMediaMessage(chatId.toString(), file, authentication));
    }

    // ─── getMessagesByChatId ──────────────────────────────────────────────────

    @Test
    @DisplayName("getMessagesByChatId() - trả về list tin nhắn")
    void getMessagesByChatId_success() {
        Message msg = new Message();
        msg.setId(UUID.randomUUID());
        msg.setContent("Hello");

        Page<Message> page = new PageImpl<>(List.of(msg));
        MessageDto msgDto = new MessageDto();
        msgDto.setId(msg.getId());

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));
        when(messageRepository.findByChatIdForUser(eq(chatId), eq(sender.getId()), any(), any(Pageable.class)))
                .thenReturn(page);
        when(messageMapper.toDto(msg)).thenReturn(msgDto);
        when(messageReactionRepository.findByMessageIdIn(any())).thenReturn(List.of());

        List<MessageDto> result = messageService.getMessagesByChatId(chatId.toString(), 0, 30, authentication);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getMessagesByChatId() - không phải thành viên → throw")
    void getMessagesByChatId_notMember_throws() {
        User stranger = new User();
        stranger.setId(UUID.randomUUID());
        stranger.setEmail("stranger@gmail.com");

        when(authentication.getName()).thenReturn("stranger@gmail.com");
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.of(stranger));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> messageService.getMessagesByChatId(chatId.toString(), 0, 30, authentication))
                .isInstanceOf(UnauthorizedException.class);
    }

    // ─── recallMessage ────────────────────────────────────────────────────────

    @Test
    @DisplayName("recallMessage() - thu hồi thành công")
    void recallMessage_success() {
        Message msg = new Message();
        msg.setId(messageId);
        msg.setSender(sender);
        msg.setChat(chat);
        msg.setDeleted(false);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));
        when(messageRepository.save(any())).thenReturn(msg);

        assertThatNoException().isThrownBy(() -> messageService.recallMessage(messageId, authentication));

        assertThat(msg.isDeleted()).isTrue();
        verify(notificationService).sendMessageRecalledNotification(eq(receiver.getEmail()), eq(messageId), any());
    }

    @Test
    @DisplayName("recallMessage() - không phải tin nhắn của mình → throw")
    void recallMessage_notOwner_throws() {
        Message msg = new Message();
        msg.setId(messageId);
        msg.setSender(receiver); // sender là receiver
        msg.setChat(chat);
        msg.setDeleted(false);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));

        assertThatThrownBy(() -> messageService.recallMessage(messageId, authentication))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("của mình");
    }

    @Test
    @DisplayName("recallMessage() - đã thu hồi rồi → throw")
    void recallMessage_alreadyDeleted_throws() {
        Message msg = new Message();
        msg.setId(messageId);
        msg.setSender(sender);
        msg.setChat(chat);
        msg.setDeleted(true);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));

        assertThatThrownBy(() -> messageService.recallMessage(messageId, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("thu hồi");
    }

    // ─── deleteMessageForMe ───────────────────────────────────────────────────

    @Test
    @DisplayName("deleteMessageForMe() - người gửi xóa → deletedBySender = true")
    void deleteMessageForMe_bySender() {
        Message msg = new Message();
        msg.setId(messageId);
        msg.setSender(sender);
        msg.setChat(chat);

        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));
        when(messageRepository.save(any())).thenReturn(msg);

        assertThatNoException().isThrownBy(() -> messageService.deleteMessageForMe(messageId, authentication));

        assertThat(msg.isDeletedBySender()).isTrue();
        assertThat(msg.isDeletedByReceiver()).isFalse();
    }

    @Test
    @DisplayName("deleteMessageForMe() - người nhận xóa → deletedByReceiver = true")
    void deleteMessageForMe_byReceiver() {
        Message msg = new Message();
        msg.setId(messageId);
        msg.setSender(sender);
        msg.setChat(chat);

        when(authentication.getName()).thenReturn("receiver@gmail.com");
        when(userRepository.findByEmail("receiver@gmail.com")).thenReturn(Optional.of(receiver));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(msg));
        when(messageRepository.save(any())).thenReturn(msg);

        assertThatNoException().isThrownBy(() -> messageService.deleteMessageForMe(messageId, authentication));

        assertThat(msg.isDeletedByReceiver()).isTrue();
        assertThat(msg.isDeletedBySender()).isFalse();
    }

    // ─── setMessagesToSeen ────────────────────────────────────────────────────

    @Test
    @DisplayName("setMessagesToSeen() - đánh dấu đã xem thành công")
    void setMessagesToSeen_success() {
        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatNoException().isThrownBy(
                () -> messageService.setMessagesToSeen(chatId.toString(), authentication));

        verify(messageRepository).markMessagesAsRead(chatId, sender.getId(), MessageState.SEEN);
        verify(notificationService).sendMessageSeenNotification(eq(receiver.getEmail()), eq(chatId));
    }

    // ─── setMessagesToDelivered ───────────────────────────────────────────────

    @Test
    @DisplayName("setMessagesToDelivered() - đánh dấu delivered thành công")
    void setMessagesToDelivered_success() {
        when(userRepository.findByEmail("sender@gmail.com")).thenReturn(Optional.of(sender));
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatNoException().isThrownBy(
                () -> messageService.setMessagesToDelivered(chatId.toString(), authentication));

        verify(messageRepository).markMessagesAsDelivered(chatId, sender.getId(), MessageState.DELIVERED);
        verify(notificationService).sendMessageDeliveredNotification(any(), any());
    }
}
