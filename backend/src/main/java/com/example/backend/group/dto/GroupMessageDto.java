package com.example.backend.group.dto;

import com.example.backend.messaging.enums.MessageType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.example.backend.reaction.dto.ReactionDto;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GroupMessageDto {
    private UUID id;
    private String content;
    private String mediaUrl;
    private String fileName;
    private MessageType type;
    private UUID groupId;
    private UUID senderId;
    private String senderName;
    @JsonProperty("isMine")
    private boolean isMine;
    private Instant createdDate;
    private boolean deleted;
    private boolean pinned;
    private boolean hiddenForMe;
    private List<ReactionDto> reactions;
}
