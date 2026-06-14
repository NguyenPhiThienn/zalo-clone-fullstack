import { fetchAPI } from "@/lib/fetch";
import { ReactionDto } from "./message";

// GroupMemberDto — khớp chính xác với BE GroupMemberDto.java
export interface GroupMemberDto {
  userId: string;       // BE dùng "userId", không phải "id"
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  admin: boolean;       // BE dùng "admin", không phải "isAdmin"
  online: boolean;
  lastSeenText?: string;
}

// Helper để lấy tên đầy đủ của thành viên nhóm
export const getMemberName = (m: GroupMemberDto): string =>
  `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;

// GroupDto — khớp chính xác với BE GroupDto.java
export interface GroupDto {
  id: string;
  name: string;
  description?: string;
  avatarUrl: string | null;
  createdById: string;
  memberCount: number;
  members: GroupMemberDto[];
  isAdmin: boolean;
  // Preview tin nhắn cuối
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSenderName?: string;
  lastMessageType?: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO" | "SYSTEM";
  unreadCount?: number;
  // Ghim tin nhắn
  pinnedMessages?: GroupMessageDto[];
}

// GroupMessageDto — khớp chính xác với BE GroupMessageDto.java
export interface GroupMessageDto {
  id: string;
  groupId?: string;
  senderId: string;
  senderName?: string;
  content?: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "SYSTEM";
  mediaUrl?: string;
  fileName?: string;
  createdDate?: string;
  deleted?: boolean;
  pinned?: boolean;
  reactions?: ReactionDto[];
  replyTo?: any;
}

export interface GroupJoinRequestDto {
  id: string;
  groupId: string;
  requestedById: string;
  requestedByName: string;
  requestedByAvatarUrl: string | null;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatarUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdDate: string;
}

export interface MediaItem {
  id: string;
  url: string;
  fileName: string;
  senderName: string;
  createdDate: string;
}

export interface LinkItem {
  url: string;
  senderName: string;
  createdDate: string;
}

export interface GroupMediaDto {
  images: MediaItem[];
  videos: MediaItem[];
  files: MediaItem[];
  links: LinkItem[];
}

export const getMyGroups = async (): Promise<GroupDto[]> => {
  return fetchAPI("/group");
};

export const getGroupById = async (groupId: string): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}`);
};

export const getGroupMessages = async (groupId: string, page = 0, size = 30): Promise<GroupMessageDto[]> => {
  return fetchAPI(`/group/${groupId}/messages?page=${page}&size=${size}`);
};

export const createGroup = async (payload: { name: string; memberIds: string[] }): Promise<GroupDto> => {
  return fetchAPI("/group", {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const sendGroupMessage = async (groupId: string, payload: { content?: string; type?: string; mentionedUserIds?: string[]; mentionAll?: boolean; replyToId?: string; replyTo?: any }): Promise<GroupMessageDto> => {
  return fetchAPI(`/group/${groupId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const uploadGroupMedia = async (groupId: string, formData: FormData): Promise<GroupMessageDto> => {
  return fetchAPI(`/group/${groupId}/upload-media`, {
    method: 'POST',
    body: formData
  });
};

export const recallGroupMessage = async (groupId: string, messageId: string): Promise<void> => {
  await fetchAPI(`/group/${groupId}/messages/${messageId}/recall`, { method: 'DELETE' });
};

export const deleteGroupMessageForMe = async (groupId: string, messageId: string): Promise<void> => {
  await fetchAPI(`/group/${groupId}/messages/${messageId}`, { method: 'DELETE' });
};

export const updateGroup = async (groupId: string, payload: { name: string }): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}`, { method: 'PUT', body: JSON.stringify(payload) });
};

export const uploadGroupAvatar = async (groupId: string, formData: FormData): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}/avatar`, { method: 'POST', body: formData });
};

export const addGroupMembers = async (groupId: string, memberIds: string[]): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userIds: memberIds }) });
};

export const removeGroupMember = async (groupId: string, userId: string): Promise<void> => {
  await fetchAPI(`/group/${groupId}/members/${userId}`, { method: 'DELETE' });
};

export const setGroupAdmin = async (groupId: string, userId: string): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}/members/${userId}/set-admin`, { method: 'PATCH' });
};

export const leaveGroup = async (groupId: string, newAdminId?: string): Promise<void> => {
  const query = newAdminId ? `?newAdminId=${encodeURIComponent(newAdminId)}` : '';
  await fetchAPI(`/group/${groupId}/leave${query}`, { method: 'DELETE' });
};

export const dissolveGroup = async (groupId: string): Promise<void> => {
  await fetchAPI(`/group/${groupId}/dissolve`, { method: 'DELETE' });
};

export const pinGroupMessage = async (groupId: string, messageId: string): Promise<GroupMessageDto[]> => {
  return fetchAPI(`/group/${groupId}/messages/${messageId}/pin`, { method: 'POST' });
};

export const unpinGroupMessage = async (groupId: string, messageId: string): Promise<GroupMessageDto[]> => {
  return fetchAPI(`/group/${groupId}/messages/${messageId}/pin`, { method: 'DELETE' });
};

export const getPinnedGroupMessages = async (groupId: string): Promise<GroupMessageDto[]> => {
  return fetchAPI(`/group/${groupId}/pinned-messages`);
};

export const getGroupMedia = async (groupId: string): Promise<GroupMediaDto> => {
  return fetchAPI(`/group/${groupId}/media`);
};

export const createJoinRequests = async (groupId: string, userIds: string[]): Promise<GroupJoinRequestDto[]> => {
  return fetchAPI(`/group/${groupId}/join-requests`, {
    method: 'POST',
    body: JSON.stringify({ userIds })
  });
};

export const getJoinRequests = async (groupId: string): Promise<GroupJoinRequestDto[]> => {
  return fetchAPI(`/group/${groupId}/join-requests`);
};

export const approveJoinRequest = async (groupId: string, requestId: string): Promise<GroupDto> => {
  return fetchAPI(`/group/${groupId}/join-requests/${requestId}/approve`, { method: 'PUT' });
};

export const rejectJoinRequest = async (groupId: string, requestId: string): Promise<void> => {
  await fetchAPI(`/group/${groupId}/join-requests/${requestId}/reject`, { method: 'PUT' });
};
