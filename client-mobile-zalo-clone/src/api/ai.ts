import { fetchAPI } from "@/lib/fetch";

export interface AiMessageDto {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdDate: string;
}

export interface SmartReplyResponse {
  suggestions: string[];
}

export interface SummarizeResponse {
  summary: string;
  messageCount: number;
  topSpeakers: string[];
  from: string;
  to: string;
}

export const chatWithAi = async (message: string): Promise<AiMessageDto> => {
  return fetchAPI("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

export const getAiHistory = async (page = 0, size = 30): Promise<{ content: AiMessageDto[] }> => {
  return fetchAPI(`/ai/history?page=${page}&size=${size}`);
};

export const clearAiHistory = async (): Promise<void> => {
  await fetchAPI("/ai/history", {
    method: "DELETE",
  });
};

export const getGroupSmartReplies = async (groupId: string): Promise<SmartReplyResponse> => {
  return fetchAPI(`/group/${groupId}/ai/smart-reply`, {
    method: "POST",
  });
};

export const summarizeGroupMessages = async (groupId: string, since: string): Promise<SummarizeResponse> => {
  return fetchAPI(`/group/${groupId}/ai/summarize`, {
    method: "POST",
    body: JSON.stringify({ since }),
  });
};

export const getChatSmartReplies = async (chatId: string): Promise<SmartReplyResponse> => {
  return fetchAPI(`/chat/${chatId}/ai/smart-reply`, {
    method: "POST",
  });
};

export const summarizeChatMessages = async (chatId: string, since: string): Promise<SummarizeResponse> => {
  return fetchAPI(`/chat/${chatId}/ai/summarize`, {
    method: "POST",
    body: JSON.stringify({ since }),
  });
};

