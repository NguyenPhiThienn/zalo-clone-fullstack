package com.example.backend.call.dto;

import com.example.backend.call.entity.CallSession.CallStatus;
import com.example.backend.call.entity.CallSession.CallType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/** DTO trả về lịch sử cuộc gọi cho client */
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CallSessionDto {
    private UUID id;
    private UUID chatId;
    private UUID initiatorId;
    private String initiatorName;
    private String initiatorAvatar;
    private UUID receiverId;
    private String receiverName;
    private String receiverAvatar;
    private CallType callType;
    private CallStatus status;
    private Integer durationSec;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
}
