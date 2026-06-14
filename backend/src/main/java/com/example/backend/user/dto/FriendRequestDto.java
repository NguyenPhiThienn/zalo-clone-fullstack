package com.example.backend.user.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor
public class FriendRequestDto {
    private UUID id;
    private UUID senderId;
    private String senderName;
    private String senderEmail;
    private String senderAvatarUrl;
    private boolean senderOnline;
    private UUID receiverId;
    private String receiverName;
    private String receiverEmail;
    private String receiverAvatarUrl;
    private String status;
    private Instant createdDate;
}
