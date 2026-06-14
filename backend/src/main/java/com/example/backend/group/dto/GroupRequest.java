package com.example.backend.group.dto;

import com.example.backend.messaging.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DTOs
// ─────────────────────────────────────────────────────────────────────────────

public class GroupRequest {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Create {
        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự")
        private String name;

        private String description;

        // Danh sách userId được mời vào nhóm (không bao gồm người tạo)
        @NotEmpty(message = "Nhóm phải có ít nhất 1 thành viên khác")
        private List<UUID> memberIds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Update {
        @Size(max = 100)
        private String name;

        private String description;
        private String avatarUrl;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AddMember {
        @NotEmpty(message = "Phải chọn ít nhất 1 thành viên")
        private List<UUID> userIds;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SendMessage {
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        private String content;

        @Builder.Default
        private MessageType type = MessageType.TEXT;
    }
}