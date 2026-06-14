import { fetchAPI } from "@/lib/fetch";
import { UserDto } from "./user";

export interface FriendRequestDto {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatarUrl: string;
  senderOnline: boolean;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverAvatarUrl: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdDate: string;
}

export const getContacts = async (): Promise<UserDto[]> => {
  return fetchAPI("/friend-request/contacts");
};

export const getPendingRequests = async (): Promise<FriendRequestDto[]> => {
  return fetchAPI("/friend-request/pending");
};

export const getSentRequests = async (): Promise<FriendRequestDto[]> => {
  return fetchAPI("/friend-request/sent");
};

export const sendFriendRequest = async (receiverId: string): Promise<FriendRequestDto> => {
  return fetchAPI(`/friend-request/send/${receiverId}`, { method: 'POST' });
};

export const acceptFriendRequest = async (requestId: string): Promise<FriendRequestDto> => {
  return fetchAPI(`/friend-request/${requestId}/accept`, { method: 'POST' });
};

export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  return fetchAPI(`/friend-request/${requestId}/reject`, { method: 'POST' });
};

export const unfriend = async (friendId: string): Promise<void> => {
  return fetchAPI(`/friend-request/unfriend/${friendId}`, { method: 'DELETE' });
};
