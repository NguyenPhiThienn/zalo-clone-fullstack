// hooks/useMessages.ts — đồng bộ với MessageDto.java (state/deleted thay vì seen/recalled)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMessagesByChatId,
  sendMessage,
  markMessagesAsSeen,
  recallMessage,
  deleteMessageForMe,
  uploadMediaMessage,
  MessageDto,
} from "@/api/message";
import { fetchAPI } from "@/lib/fetch";
import { useAuthStore } from "@/store";
import { nextSortOrder } from "@/lib/sortCounter";

/** Lấy tin nhắn của 1 chat (phân trang) */
export const useMessages = (chatId: string | null, page = 0, size = 30) => {
  return useQuery<MessageDto[]>({
    queryKey: ["messages", chatId, page],
    queryFn: () => getMessagesByChatId(chatId!, page, size),
    enabled: !!chatId,
    staleTime: 60_000, // Tăng staleTime vì đã có WebSocket
  });
};

/** Gửi tin nhắn văn bản - Optimistic UI */
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (variables) => {
      const user = useAuthStore.getState().user;
      const chatId = variables.chatId;

      // 1. Cập nhật Preview ngầm ở Home
      queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
        if (!old) return old;
        const newList = [...old];
        const index = newList.findIndex(c => c.id === chatId);
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            lastMessage: variables.content,
            lastMessageTime: new Date().toISOString(),
            lastMessageSenderName: "Bạn",
            _sortOrder: nextSortOrder(),
          };
          newList.unshift(newList.splice(index, 1)[0]);
        }
        return newList;
      });

      // 2. Chèn tin nhắn tạm thời vào danh sách nhắn tin
      const tempId = 'temp-' + Date.now();
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        const current = old || [];
        const newMessage = {
          id: tempId,
          content: variables.content,
          senderId: (user as any)?.id,
          createdAt: new Date().toISOString(),
          state: 'SENDING',
          type: variables.type || 'TEXT',
          deleted: false,
          replyTo: (variables as any).replyTo,
        };
        return [newMessage, ...current];
      });

      return { tempId, chatId };
    },
    onSuccess: (data, variables, context) => {
      // Thay thế tin nhắn tạm bằng tin nhắn thật từ server
      queryClient.setQueryData(["messages", context?.chatId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        const alreadyExists = old.some(m => m.id === data.id);
        if (alreadyExists) return old.filter(m => m.id !== context?.tempId);
        return old.map(m => m.id === context?.tempId ? data : m);
      });
    },
  });
};

/** Upload media (ảnh, video, file) - Optimistic UI */
export const useUploadMedia = (chatId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { formData: FormData, localUri: string, fileType: string, fileName: string, replyTo?: any }) =>
      uploadMediaMessage(chatId, data.formData),
    onMutate: async (variables) => {
      const user = useAuthStore.getState().user;
      const tempId = 'temp-media-' + Date.now();

      // 1. Cập nhật Preview Home
      queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
        if (!old) return old;
        const newList = [...old];
        const index = newList.findIndex(c => c.id === chatId);
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            lastMessage: "[Hình ảnh/Tệp tin]",
            lastMessageTime: new Date().toISOString(),
            lastMessageSenderName: "Bạn",
            _sortOrder: nextSortOrder(),
          };
          newList.unshift(newList.splice(index, 1)[0]);
        }
        return newList;
      });

      // 2. Chèn tin nhắn media tạm thời (dùng localUri để hiện ảnh ngay)
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        const current = old || [];
        const isImage = variables.fileType.startsWith('image');
        const newMessage = {
          id: tempId,
          content: variables.fileName,
          mediaUrl: variables.localUri, // Dùng ảnh local để hiện luôn
          senderId: (user as any)?.id,
          senderName: (user as any)?.name || (user as any)?.firstName || "Bạn",
          createdAt: new Date().toISOString(),
          state: 'SENDING',
          type: isImage ? 'IMAGE' : (variables.fileType.startsWith('video') ? 'VIDEO' : 'FILE'),
          deleted: false,
          replyTo: variables.replyTo,
        };
        return [newMessage, ...current];
      });

      return { tempId, chatId };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        const alreadyExists = old.some(m => m.id === data.id);
        if (alreadyExists) return old.filter(m => m.id !== context?.tempId);
        return old.map(m => m.id === context?.tempId ? data : m);
      });
    },
  });
};

/** Đánh dấu đã xem - SILENT */
export const useMarkSeen = () => {
  return useMutation({
    mutationFn: (chatId: string) => markMessagesAsSeen(chatId),
  });
};

/** Thu hồi tin nhắn - cả 2 phía */
export const useRecallMessage = (chatId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => recallMessage(messageId),
    onMutate: async (messageId) => {
      const user = useAuthStore.getState().user;
      const senderName = (user as any)?.name || (user as any)?.firstName || "Bạn";
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((m: any) => m.id === messageId
          ? { ...m, deleted: true, content: `Tin nhắn đã được ${senderName} thu hồi`, text: `Tin nhắn đã được ${senderName} thu hồi` }
          : m
        );
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId, 0] });
    },
  });
};

/** Xóa phía mình - chỉ ẩn trên thiết bị của mình */
export const useDeleteMessage = (chatId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessageForMe(messageId),
    onMutate: async (messageId) => {
      // Xóa luôn khỏi danh sách phía mình
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter((m: any) => m.id !== messageId);
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId, 0] });
    },
  });
};
