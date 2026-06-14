package com.example.backend.chat.service;

import com.example.backend.chat.entity.Chat;
import com.example.backend.user.entity.User;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.chat.mapper.ChatMapper;
import com.example.backend.messaging.mapper.MessageMapper;
import com.example.backend.chat.dto.ChatDto;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.shared.service.OnlineStatusService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import com.example.backend.user.service.BlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private final ChatRepository chatRepository;
    private final ChatMapper chatMapper;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;
    private final BlockService blockService;
    private final OnlineStatusService onlineStatusService;
    private final org.springframework.cache.CacheManager cacheManager;

    private void evictChatsCache(String email) {
        var cache = cacheManager.getCache("chats");
        if (cache != null) cache.evict(email);
    }

    @Override
    @Cacheable(value = "chats", key = "#currentUser.name")
    @Transactional(readOnly = true)
    public List<ChatDto> getChatByReceiverId(Authentication currentUser) {
        final String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return chatRepository.findAllChatsWithSummaryByUserId(user.getId())
                .stream()
                .map(row -> {
                    Chat chat = (Chat) row[0];
                    Long unreadCount = (Long) row[1];
                    String lastContent = (String) row[2];
                    com.example.backend.messaging.enums.MessageType lastType = (com.example.backend.messaging.enums.MessageType) row[3];
                    java.time.Instant lastTime = (java.time.Instant) row[4];

                    ChatDto dto = chatMapper.toDto(chat);
                    dto.setChatName(chat.getChatName(user.getId()));
                    dto.setUnreadCount(unreadCount.intValue());

                    User otherUser = chat.getOtherUser(user.getId());
                    dto.setRecipientId(otherUser.getId());
                    dto.setRecipientEmail(otherUser.getEmail());
                    dto.setAvatarUrl(otherUser.getAvatarUrl());
                    dto.setRecipientOnline(onlineStatusService.isOnline(otherUser.getId()));
                    dto.setRecipientLastSeenText(otherUser.getLastSeenText());

                    dto.setLastMessage(lastContent);
                    dto.setLastMessageType(lastType);
                    dto.setLastMessageTime(lastTime);

                    boolean blockedByMe = blockService.isBlockedByMe(user.getId(), otherUser.getId());
                    boolean blockedByThem = blockService.isBlockedByMe(otherUser.getId(), user.getId());
                    if (blockedByMe) dto.setBlockStatus("BLOCKED_BY_ME");
                    else if (blockedByThem) dto.setBlockStatus("BLOCKED_BY_THEM");
                    else dto.setBlockStatus("NONE");

                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ChatDto getChatById(UUID chatId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Chat chat = chatRepository.findChatWithUsersById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        if (!chat.containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        return mapChatToDto(chat, user);
    }

    @Override
    @Transactional
    public ChatDto getOrCreateChat(UUID otherUserId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getId().equals(otherUserId)) {
            throw new IllegalArgumentException("Cannot create chat with yourself");
        }

        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + otherUserId));

        Chat chat = chatRepository.findChatBetweenTwoUsers(user.getId(), otherUserId)
                .orElseGet(() -> {
                    Chat newChat = Chat.builder()
                            .user1(user)
                            .user2(otherUser)
                            .build();
                    return chatRepository.save(newChat);
                });

        evictChatsCache(user.getEmail());
        evictChatsCache(otherUser.getEmail());

        return mapChatToDto(chat, user);
    }

    @Override
    @CacheEvict(value = "chats", key = "#currentUser.name")
    @Transactional
    public void deleteChat(UUID chatId, Authentication currentUser) {
        String email = currentUser.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found with id: " + chatId));

        if (!chat.containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied: you are not a member of this chat");
        }

        // Soft-delete: chỉ ẩn phía user này, lưu timestamp để lọc tin nhắn cũ khi mở lại
        Instant now = Instant.now();
        if (chat.getUser1().getId().equals(user.getId())) {
            chat.setDeletedByUser1(true);
            chat.setDeletedAtByUser1(now);
        } else {
            chat.setDeletedByUser2(true);
            chat.setDeletedAtByUser2(now);
        }
        chatRepository.save(chat);
    }

    private ChatDto mapChatToDto(Chat chat, User currentUser) {
        ChatDto dto = chatMapper.toDto(chat);
        dto.setChatName(chat.getChatName(currentUser.getId()));
        dto.setUnreadCount(messageRepository.countUnreadMessages(chat.getId(), currentUser.getId()));

        User otherUser = chat.getOtherUser(currentUser.getId());
        dto.setRecipientId(otherUser.getId());
        dto.setRecipientEmail(otherUser.getEmail());
        dto.setAvatarUrl(otherUser.getAvatarUrl());
        dto.setRecipientOnline(onlineStatusService.isOnline(otherUser.getId()));
        dto.setRecipientLastSeenText(otherUser.getLastSeenText());
        messageRepository.findTop1ByChatIdOrderByCreatedDateDesc(chat.getId())
                .ifPresent(last -> {
                    dto.setLastMessage(last.getContent());
                    dto.setLastMessageType(last.getType());
                    dto.setLastMessageTime(last.getCreatedDate());
                });

        boolean blockedByMe = blockService.isBlockedByMe(currentUser.getId(), otherUser.getId());
        boolean blockedByThem = blockService.isBlockedByMe(otherUser.getId(), currentUser.getId());
        if (blockedByMe) dto.setBlockStatus("BLOCKED_BY_ME");
        else if (blockedByThem) dto.setBlockStatus("BLOCKED_BY_THEM");
        else dto.setBlockStatus("NONE");

        return dto;
    }
}
