package com.example.backend.messaging.dto;

import com.example.backend.messaging.enums.MessageState;
import com.example.backend.messaging.enums.MessageType;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.example.backend.reaction.dto.ReactionDto;

@Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
public class MessageDto {
    private UUID id;
    private UUID chatId;
    private String content;
    private MessageState state;
    private MessageType type;
    private Instant createdAt;
    private UUID senderId;
    private UUID receiverId;
    private String mediaUrl;
    private String fileName;
    private boolean deleted;
    private List<ReactionDto> reactions;
    /** Tên người gửi — chỉ set cho tin nhắn của AI Bot, null với tin nhắn thường */
    private String senderName;
}
