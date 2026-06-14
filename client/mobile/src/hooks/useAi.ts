import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatWithAi, getAiHistory, clearAiHistory } from "@/api/ai";

export const useAiHistory = (page = 0) => {
  return useQuery({
    queryKey: ["ai-history", page],
    queryFn: () => getAiHistory(page),
  });
};

export const useChatWithAi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => chatWithAi(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-history"] });
    },
  });
};

export const useClearAiHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAiHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-history"] });
    },
  });
};

export const useGroupSmartReplies = (groupId: string) => {
  return useQuery({
    queryKey: ["group-smart-replies", groupId],
    queryFn: () => import("@/api/ai").then(m => m.getGroupSmartReplies(groupId)),
    enabled: !!groupId,
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useSummarizeGroup = () => {
  return useMutation({
    mutationFn: ({ groupId, since }: { groupId: string; since: string }) => 
      import("@/api/ai").then(m => m.summarizeGroupMessages(groupId, since)),
  });
};

export const useChatSmartReplies = (chatId: string) => {
  return useQuery({
    queryKey: ["chat-smart-replies", chatId],
    queryFn: () => import("@/api/ai").then(m => m.getChatSmartReplies(chatId)),
    enabled: !!chatId,
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useSummarizeChat = () => {
  return useMutation({
    mutationFn: ({ chatId, since }: { chatId: string; since: string }) => 
      import("@/api/ai").then(m => m.summarizeChatMessages(chatId, since)),
  });
};

