// hooks/useChat.ts — đồng bộ với ChatDto.java (flat structure)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllChats, getChatById, startOrGetChat, ChatDto } from "@/api/chat";
import { getAllUsers, searchUsers, UserDto } from "@/api/user";

// ─── Chat hooks ───────────────────────────────────────────────────────────────

/** Lấy danh sách tất cả cuộc hội thoại */
export const useChats = () => {
  return useQuery<ChatDto[]>({
    queryKey: ["chats"],
    queryFn: getAllChats,
    // staleTime: Infinity — Socket cập nhật list real-time qua setQueryData.
    // Không để React Query tự refetch nền vì BE Redis cache (TTL 30s) của người nhận
    // chưa bị evict khi chat mới tạo → sẽ trả về data cũ và ghi đè lên cache!
    // Chỉ refetch khi user kéo refresh thủ công (ConversationList.refetchChats()).
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

/** Lấy chi tiết 1 cuộc hội thoại */
export const useChatById = (chatId: string | null) => {
  return useQuery<ChatDto>({
    queryKey: ["chat", chatId],
    queryFn: () => getChatById(chatId!),
    enabled: !!chatId,
  });
};

export const useStartChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) => startOrGetChat(otherUserId),
    onSuccess: (newChat) => {
      queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
        const currentList = old ? [...old] : [];
        if (currentList.some(c => c.id === newChat.id)) return old;
        const initializedChat = {
          ...newChat,
          lastMessageTime: newChat.lastMessageTime || new Date().toISOString()
        };
        return [initializedChat, ...currentList];
      });
    },
  });
};

// ─── User/Contact hooks ───────────────────────────────────────────────────────

/** Lấy danh sách tất cả user (danh bạ), trừ bản thân */
export const useUsers = () => {
  return useQuery<UserDto[]>({
    queryKey: ["users"],
    queryFn: getAllUsers,
    staleTime: 60_000,
  });
};

/** Tìm kiếm user theo keyword */
export const useSearchUsers = (keyword: string) => {
  return useQuery<UserDto[]>({
    queryKey: ["users-search", keyword],
    queryFn: () => searchUsers(keyword),
    enabled: keyword.trim().length > 0,
  });
};
