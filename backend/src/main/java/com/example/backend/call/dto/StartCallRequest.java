package com.example.backend.call.dto;

import lombok.*;
import java.util.UUID;

/** Body request khi client lưu cuộc gọi vào DB (gọi sau khi kết thúc) */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StartCallRequest {
    private UUID chatId;
    private UUID receiverId;
    private String callType;   // "VOICE" | "VIDEO"
    private String status;     // "MISSED" | "ENDED" | "REJECTED"
    private Integer durationSec;
}
