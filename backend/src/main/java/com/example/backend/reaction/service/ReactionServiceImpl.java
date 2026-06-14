package com.example.backend.reaction.service;

import com.example.backend.user.entity.User;
import com.example.backend.messaging.entity.Message;
import com.example.backend.messaging.entity.MessageReaction;
import com.example.backend.group.entity.GroupMessage;
import com.example.backend.group.entity.GroupMessageReaction;
import com.example.backend.shared.exception.ResourceNotFoundException;
import com.example.backend.shared.exception.UnauthorizedException;
import com.example.backend.reaction.dto.ReactionDto;
import com.example.backend.messaging.repository.MessageReactionRepository;
import com.example.backend.messaging.repository.MessageRepository;
import com.example.backend.group.repository.GroupMessageReactionRepository;
import com.example.backend.group.repository.GroupMessageRepository;
import com.example.backend.user.repository.UserRepository;
import com.example.backend.chat.repository.ChatRepository;
import com.example.backend.messaging.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReactionServiceImpl implements ReactionService {

    private final MessageReactionRepository messageReactionRepository;
    private final GroupMessageReactionRepository groupMessageReactionRepository;
    private final MessageRepository messageRepository;
    private final GroupMessageRepository groupMessageRepository;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.example.backend.messaging.mapper.ReactionMapper reactionMapper;

    @Override
    @Transactional
    public List<ReactionDto> reactToMessage(UUID messageId, String emoji, Authentication auth) {
        User user = getUser(auth);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found: " + messageId));

        if (!message.getChat().containsUser(user.getId())) {
            throw new UnauthorizedException("Access denied");
        }

        messageReactionRepository.findByMessageIdAndUserId(messageId, user.getId())
                .ifPresentOrElse(
                        reaction -> {
                            if (reaction.getEmoji().equals(emoji)) {
                                messageReactionRepository.delete(reaction);
                            } else {
                                reaction.setEmoji(emoji);
                                messageReactionRepository.save(reaction);
                            }
                        },
                        () -> {
                            MessageReaction reaction = MessageReaction.builder()
                                    .message(message)
                                    .user(user)
                                    .emoji(emoji)
                                    .build();
                            messageReactionRepository.save(reaction);
                        }
                );

        List<ReactionDto> reactions = getMessageReactions(messageId);
        User receiver = message.getChat().getOtherUser(user.getId());
        notificationService.sendReactionNotification(receiver.getEmail(), messageId, message.getChat().getId(), reactions);
        return reactions;
    }

    @Override
    @Transactional
    public void removeReactionFromMessage(UUID messageId, Authentication auth) {
        User user = getUser(auth);
        messageReactionRepository.deleteByMessageIdAndUserId(messageId, user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReactionDto> getMessageReactions(UUID messageId) {
        return messageReactionRepository.findByMessageId(messageId)
                .stream()
                .map(reactionMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<ReactionDto> reactToGroupMessage(UUID groupMessageId, String emoji, Authentication auth) {
        User user = getUser(auth);
        GroupMessage message = groupMessageRepository.findById(groupMessageId)
                .orElseThrow(() -> new ResourceNotFoundException("Group message not found: " + groupMessageId));

        if (!message.getGroup().isMember(user.getId())) {
            throw new UnauthorizedException("Access denied");
        }

        groupMessageReactionRepository.findByGroupMessageIdAndUserId(groupMessageId, user.getId())
                .ifPresentOrElse(
                        reaction -> {
                            if (reaction.getEmoji().equals(emoji)) {
                                groupMessageReactionRepository.delete(reaction);
                            } else {
                                reaction.setEmoji(emoji);
                                groupMessageReactionRepository.save(reaction);
                            }
                        },
                        () -> {
                            GroupMessageReaction reaction = GroupMessageReaction.builder()
                                    .groupMessage(message)
                                    .user(user)
                                    .emoji(emoji)
                                    .build();
                            groupMessageReactionRepository.save(reaction);
                        }
                );

        List<ReactionDto> reactions = getGroupMessageReactions(groupMessageId);
        messagingTemplate.convertAndSend("/topic/group/" + message.getGroup().getId(),
                new ReactionGroupEvent(groupMessageId, reactions));

        User msgSender = message.getSender();
        if (!msgSender.getId().equals(user.getId())) {
            notificationService.sendGroupReactionNotification(
                    msgSender.getEmail(),
                    message.getGroup().getId(),
                    user.getFirstName() + " " + user.getLastName(),
                    emoji
            );
        }

        return reactions;
    }

    @Override
    @Transactional
    public void removeReactionFromGroupMessage(UUID groupMessageId, Authentication auth) {
        User user = getUser(auth);
        groupMessageReactionRepository.deleteByGroupMessageIdAndUserId(groupMessageId, user.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReactionDto> getGroupMessageReactions(UUID groupMessageId) {
        return groupMessageReactionRepository.findByGroupMessageId(groupMessageId)
                .stream()
                .map(r -> ReactionDto.builder()
                        .id(r.getId())
                        .userId(r.getUser().getId())
                        .userFullName(r.getUser().getFirstName() + " " + r.getUser().getLastName())
                        .emoji(r.getEmoji())
                        .createdDate(r.getCreatedDate())
                        .build())
                .collect(Collectors.toList());
    }

    private User getUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public record ReactionGroupEvent(UUID messageId, List<ReactionDto> reactions) {}
}
