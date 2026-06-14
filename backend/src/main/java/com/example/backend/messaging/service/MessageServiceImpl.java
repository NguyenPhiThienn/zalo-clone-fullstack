package com.example.backend.messaging.service;

import com.example.backend.chat.entity.Chat;
import com.example.backend.file.service.FileStorageService;
import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.entity.MessageReaction;
import com.example.backend.user.entity.User;
import com.example.backend.messaging.enums.MessageState;
import com.example.backend.messaging.enums.MessageType;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.messaging.mapper.MessageMapper;
import com.example.backend.messaging.dto.MessageDto;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.messaging.repository.MessageReactionRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.ai.service.ChatAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.CacheManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageServiceImpl implements MessageService {
    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final MessageMapper messageMapper;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MessageReactionRepository messageReactionRepository;
    private final com.example.backend.user.service.BlockService blockService;
    private final ChatAiService chatAiService;
    private final CacheManager cacheManager;
    private final com.example.backend.messaging.mapper.ReactionMapper reactionMapper;

    @Override
    @Transactional
    public MessageDto sendMessage(MessageDto messageDto, Authentication currentUser) {

        String email = currentUser.getName();
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Chat chat = chatRepository.findById(messageDto.getChatId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + messageDto.getChatId()));

        if (!chat.containsUser(sender.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        User receiver = chat.getOtherUser(sender.getId());
        if (blockService.isBlocked(sender.getId(), receiver.getId())) {
            throw new UnauthorizedException("Không thể gửi tin nhắn: người dùng đã bị chặn");
        }

        if (messageDto.getType() == MessageType.TEXT
                && (messageDto.getContent() == null || messageDto.getContent().isBlank())) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }

        // Khi gửi tin nhắn: restore chat cho cả người gửi lẫn người nhận
        boolean needSave = false;
        if (chat.getUser1().getId().equals(sender.getId())) {
            if (chat.isDeletedByUser1()) { chat.setDeletedByUser1(false); needSave = true; }
            if (chat.isDeletedByUser2()) { chat.setDeletedByUser2(false); needSave = true; }
        } else {
            if (chat.isDeletedByUser2()) { chat.setDeletedByUser2(false); needSave = true; }
            if (chat.isDeletedByUser1()) { chat.setDeletedByUser1(false); needSave = true; }
        }
        if (needSave) chatRepository.save(chat);

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(messageDto.getContent())
                .state(MessageState.SENT)
                .type(messageDto.getType() != null ? messageDto.getType() : MessageType.TEXT)
                .build();

        Message savedMessage = messageRepository.save(message);
        MessageDto savedDto = messageMapper.toDto(savedMessage);

        log.info("Broadcasting real-time message in chat {} from {}", chat.getId(), sender.getId());
        notificationService.sendChatBroadcast(chat.getId(), savedDto);
        notificationService.sendMessageNotification(receiver.getEmail(), savedDto);
        evictChatsCache(sender.getEmail());
        evictChatsCache(receiver.getEmail());

        if (MessageType.TEXT.equals(savedMessage.getType())
                && savedMessage.getContent() != null
                && savedMessage.getContent().toLowerCase().contains("@ai")) {
            String senderFullName = sender.getFirstName() + " " + sender.getLastName();
            chatAiService.handleBotMentionAsync(chat.getId(), savedMessage.getContent(), senderFullName);
        }

        return savedDto;
    }

    @Override
    @Transactional
    public MessageDto uploadMediaMessage(String chatId, MultipartFile file, Authentication currentUser) {
        Chat chat = chatRepository.findById(UUID.fromString(chatId))
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        String email = currentUser.getName();
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!chat.containsUser(sender.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        User mediaReceiver = chat.getOtherUser(sender.getId());
        if (blockService.isBlocked(sender.getId(), mediaReceiver.getId())) {
            throw new UnauthorizedException("Không thể gửi tin nhắn: người dùng đã bị chặn");
        }

        String contentType = file.getContentType() != null ? file.getContentType() : "";
        MessageType messageType;
        if (contentType.startsWith("image/")) {
            messageType = MessageType.IMAGE;
        } else if (contentType.startsWith("video/")) {
            messageType = MessageType.VIDEO;
        } else if (contentType.startsWith("audio/")) {
            messageType = MessageType.AUDIO;
        } else {
            messageType = MessageType.FILE;
        }

        String filePath = fileStorageService.saveFile(file);

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(filePath)
                .state(MessageState.SENT)
                .type(messageType)
                .fileName(file.getOriginalFilename())
                .build();

        Message savedMessage = messageRepository.save(message);
        MessageDto savedDto = messageMapper.toDto(savedMessage);

        User receiver = chat.getOtherUser(sender.getId());
        log.info("Broadcasting media message in chat {} from {}", chat.getId(), sender.getId());
        notificationService.sendChatBroadcast(chat.getId(), savedDto);
        notificationService.sendMessageNotification(receiver.getEmail(), savedDto);
        return savedDto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageDto> getMessagesByChatId(String chatId, int page, int size, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID chatUuid = UUID.fromString(chatId);
        Chat chat = chatRepository.findById(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        if (!chat.containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        Instant deletedAt = chat.getDeletedAtFor(user.getId());

        Page<Message> messagePage = messageRepository.findByChatIdForUser(
                chatUuid,
                user.getId(),
                deletedAt,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"))
        );

        List<MessageDto> dtos = messagePage.getContent()
                .stream()
                .map(messageMapper::toDto)
                .collect(Collectors.toList());

        List<UUID> messageIds = messagePage.getContent().stream()
                .map(Message::getId)
                .collect(Collectors.toList());

        if (!messageIds.isEmpty()) {
            Map<UUID, List<ReactionDto>> reactionsByMsgId = messageReactionRepository
                    .findByMessageIdIn(messageIds)
                    .stream()
                    .collect(Collectors.groupingBy(
                            r -> r.getMessage().getId(),
                            Collectors.mapping(reactionMapper::toDto, Collectors.toList())
                    ));

            dtos.forEach(dto -> dto.setReactions(reactionsByMsgId.getOrDefault(dto.getId(), List.of())));
        }

        return dtos;
    }

    @Override
    @Transactional
    public void recallMessage(UUID messageId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!message.getSender().getId().equals(user.getId())) {
            throw new UnauthorizedException("Bạn chỉ có thể thu hồi tin nhắn của mình");
        }

        if (message.isDeleted()) {
            throw new IllegalArgumentException("Tin nhắn đã được thu hồi trước đó");
        }

        message.setDeleted(true);
        messageRepository.save(message);

        User receiver = message.getChat().getOtherUser(user.getId());
        notificationService.sendMessageRecalledNotification(receiver.getEmail(), messageId, message.getChat().getId());
        log.info("Message {} recalled by user {}", messageId, user.getId());
    }

    @Override
    @Transactional
    public void deleteMessageForMe(UUID messageId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found with id: " + messageId));

        if (!message.getChat().containsUser(user.getId())) {
            throw new UnauthorizedException("Bạn không phải thành viên của cuộc trò chuyện này");
        }

        if (message.getSender().getId().equals(user.getId())) {
            message.setDeletedBySender(true);
        } else {
            message.setDeletedByReceiver(true);
        }

        messageRepository.save(message);
        log.info("Message {} deleted for user {}", messageId, user.getId());
    }

    @Override
    @Transactional
    public void setMessagesToDelivered(String chatId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID chatUuid = UUID.fromString(chatId);
        Chat chat = chatRepository.findById(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        if (!chat.containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        messageRepository.markMessagesAsDelivered(chatUuid, user.getId(), MessageState.DELIVERED);

        User sender = chat.getOtherUser(user.getId());
        log.info("User {} marked messages as delivered in chat {}, notifying sender {}",
                user.getId(), chatUuid, sender.getId());
        notificationService.sendMessageDeliveredNotification(sender.getEmail(), chatUuid);
        notificationService.sendStateChangeBroadcast(chatUuid, MessageState.DELIVERED, sender.getId());
    }

    @Override
    @Transactional
    public void setAllMessagesToDelivered(Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Object[]> pending = messageRepository.findChatsWithSentMessages(user.getId());
        if (pending.isEmpty()) return;

        messageRepository.markAllMessagesAsDelivered(user.getId(), MessageState.DELIVERED);

        for (Object[] row : pending) {
            UUID chatId = (UUID) row[0];
            String senderEmail = (String) row[1];
            notificationService.sendMessageDeliveredNotification(senderEmail, chatId);
        }
        log.info("User {} marked all pending messages as delivered across {} chats", user.getId(), pending.size());
    }

    @Override
    @Transactional
    public void setMessagesToSeen(String chatId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UUID chatUuid = UUID.fromString(chatId);

        Chat chat = chatRepository.findById(chatUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        if (!chat.containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }


        messageRepository.markMessagesAsRead(chatUuid, user.getId(), MessageState.SEEN);

        // Thông báo cho sender biết messages đã được đọc
        User sender = chat.getOtherUser(user.getId());
        log.info("User {} marked messages as seen in chat {}, notifying sender {}",
                user.getId(), chatUuid, sender.getId());
        notificationService.sendMessageSeenNotification(sender.getEmail(), chatUuid);
        notificationService.sendStateChangeBroadcast(chatUuid, MessageState.SEEN, sender.getId());
    }

    private void evictChatsCache(String email) {
        var cache = cacheManager.getCache("chats");
        if (cache != null) cache.evict(email);
    }
}
