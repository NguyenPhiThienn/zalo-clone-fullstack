// api/chat.ts — đồng bộ với ChatController & ChatDto.java
import { fetchAPI } from "@/lib/fetch";

// ─── Types (khớp ChatDto.java) ────────────────────────────────────────────────
// Note: BE trả về "flat" ChatDto, không có nested receiver object
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "VOICE";

export interface ChatDto {
  id: string;               // UUID
  user1Id: string;          // UUID
  user2Id: string;          // UUID
  chatName: string;         // tên hiển thị (tên người còn lại)
  lastMessage?: string;     // nội dung tin nhắn cuối
  lastMessageType?: MessageType;
  lastMessageTime?: string; // LocalDateTime → ISO string
  unreadCount: number;
  recipientOnline: boolean;
  recipientLastSeenText?: string;
  avatarUrl?: string;
  recipientId: string;      // UUID người nhận (dùng để navigate/chat)
  recipientEmail?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** GET /api/v1/chat — Lấy danh sách tất cả cuộc hội thoại */
export const getAllChats = async (): Promise<ChatDto[]> => {
  return fetchAPI("/chat");
};

/** GET /api/v1/chat/{chatId} — Lấy chi tiết 1 cuộc hội thoại */
export const getChatById = async (chatId: string): Promise<ChatDto> => {
  return fetchAPI(`/chat/${chatId}`);
};

/** POST /api/v1/chat/start/{otherUserId} — Bắt đầu/lấy cuộc hội thoại */
export const startOrGetChat = async (otherUserId: string): Promise<ChatDto> => {
  return fetchAPI(`/chat/start/${otherUserId}`, {
    method: "POST",
  });
};
