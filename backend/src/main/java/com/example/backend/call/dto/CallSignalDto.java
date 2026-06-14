package com.example.backend.call.dto;

import lombok.*;

import java.util.UUID;

/**
 * Payload trao đổi giữa 2 peers qua WebSocket để thiết lập WebRTC.
 *
 * Các loại signal:
 *   call-offer    — người gọi gửi offer SDP + metadata cuộc gọi
 *   call-answer   — người nhận chấp nhận, gửi answer SDP
 *   call-reject   — người nhận từ chối
 *   call-cancel   — người gọi huỷ trước khi nhận
 *   call-end      — kết thúc cuộc gọi (cả 2 phía có thể gửi)
 *   ice-candidate — trao đổi ICE candidate
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CallSignalDto {

    /** Loại tín hiệu: call-offer | call-answer | call-reject | call-cancel | call-end | ice-candidate */
    private String type;

    /** chatId của cuộc trò chuyện 1-1 */
    private UUID chatId;

    /**
     * userId của người nhận tín hiệu.
     * Backend dùng để tra email → convertAndSendToUser.
     */
    private UUID targetUserId;

    /** userId của người gửi tín hiệu (backend điền vào trước khi relay) */
    private UUID fromUserId;

    /** Tên hiển thị của người gọi (để hiển thị trên IncomingCallModal) */
    private String fromUserName;

    /** Avatar URL của người gọi */
    private String fromUserAvatar;

    /** VOICE hoặc VIDEO */
    private String callType;

    /** SDP offer/answer (base64 hoặc raw) */
    private String sdp;

    /** ICE candidate JSON string */
    private String candidate;

    /** Thời lượng cuộc gọi tính bằng giây (chỉ dùng trong call-end) */
    private Integer durationSec;
}
