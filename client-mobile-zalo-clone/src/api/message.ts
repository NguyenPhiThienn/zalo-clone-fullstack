// api/message.ts — đồng bộ với MessageController & MessageDto.java
import { fetchAPI } from "@/lib/fetch";

// ─── Enums (khớp MessageState & MessageType) ──────────────────────────────────
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "VOICE" | "NOTIFICATION";
export type MessageState = "SENT" | "DELIVERED" | "SEEN";

// ─── Types (khớp MessageDto.java) ─────────────────────────────────────────────
export interface ReactionDto {
  id?: string;
  emoji: string;
  userId: string;
  userFullName?: string;
  createdDate?: string;
}

export interface MessageDto {
  id?: string;           // UUID
  chatId: string;        // UUID
  content: string;
  state?: MessageState;
  type: MessageType;
  createdAt?: string;    // LocalDateTime → ISO string
  senderId?: string;     // UUID
  senderName?: string;   // Tên người gửi (dành cho Group)
  receiverId?: string;   // UUID
  mediaUrl?: string;
  fileName?: string;
  createdDate?: string;  // Trường thay thế cho createdAt từ BE Group
  deleted?: boolean;
  reactions?: ReactionDto[];
  mentionedUserIds?: string[];
  mentionAll?: boolean;
  replyToId?: string;
  replyTo?: { id: string; content?: string; senderName?: string; mediaUrl?: string; type?: MessageType };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** POST /api/v1/message — Gửi tin nhắn văn bản (hoặc fallback REST) */
export const sendMessage = async (data: MessageDto): Promise<MessageDto> => {
  return fetchAPI("/message", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/** POST /api/v1/message/upload-media/{chatId} — Upload ảnh/video/file (field: "file") */
export const uploadMediaMessage = async (
  chatId: string,
  formData: FormData
): Promise<MessageDto> => {
  return fetchAPI(`/message/upload-media/${chatId}`, {
    method: "POST",
    body: formData,
  });
};

/** PATCH /api/v1/message/seen/{chatId} — Đánh dấu đã xem */
export const markMessagesAsSeen = async (chatId: string): Promise<void> => {
  await fetchAPI(`/message/seen/${chatId}`, {
    method: "PATCH",
  });
};

/** GET /api/v1/message/chat/{chatId}?page=0&size=30 — Lấy tin nhắn theo trang */
export const getMessagesByChatId = async (
  chatId: string,
  page = 0,
  size = 30
): Promise<MessageDto[]> => {
  return fetchAPI(`/message/chat/${chatId}?page=${page}&size=${size}`);
};

/** DELETE /api/v1/message/{messageId}/recall — Thu hồi tin nhắn */
export const recallMessage = async (messageId: string): Promise<void> => {
  await fetchAPI(`/message/${messageId}/recall`, {
    method: "DELETE",
  });
};

/** DELETE /api/v1/message/{messageId} — Xóa tin nhắn (chỉ phía mình) */
export const deleteMessageForMe = async (messageId: string): Promise<void> => {
  await fetchAPI(`/message/${messageId}`, {
    method: "DELETE",
  });
};

/** GET /api/v1/message/media/{filename} — Build URL media file */
export const getMediaUrl = (filename: string): string => {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL || "http://10.0.2.2:8080/api/v1";
  return `${baseUrl}/message/media/${filename}`;
};
