import { fetchAPI } from "@/lib/fetch";

export interface ReactionDto {
  id?: string;
  emoji: string;
  userId: string;
  userFullName?: string;
  createdDate?: string;
}

export const reactToMessage = async (messageId: string, emoji: string): Promise<ReactionDto[]> => {
  return fetchAPI(`/message/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
    method: 'POST'
  });
};

export const reactToGroupMessage = async (messageId: string, emoji: string): Promise<ReactionDto[]> => {
  return fetchAPI(`/group-message/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
    method: 'POST'
  });
};

export const removeReaction = async (messageId: string): Promise<void> => {
  await fetchAPI(`/message/${messageId}/reactions`, {
    method: 'DELETE'
  });
};

export const removeGroupReaction = async (messageId: string): Promise<void> => {
  await fetchAPI(`/group-message/${messageId}/reactions`, {
    method: 'DELETE'
  });
};
