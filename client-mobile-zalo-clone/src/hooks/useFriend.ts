import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getContacts,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
} from "@/api/friend";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "@/api/user";
import { startOrGetChat } from "@/api/chat";

export const useContacts = () => {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: getContacts,
  });
};

export const usePendingRequests = () => {
  return useQuery({
    queryKey: ["friend-requests", "pending"],
    queryFn: getPendingRequests,
  });
};

export const useSentRequests = () => {
  return useQuery({
    queryKey: ["friend-requests", "sent"],
    queryFn: getSentRequests,
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      // Tự động khởi tạo chat khi đồng ý kết bạn để cả 2 bên cùng subscribe topic real-time ngay
      if (data?.senderId) {
        startOrGetChat(data.senderId).then((newChat) => {
          queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
            const currentList = old ? [...old] : [];
            if (currentList.some(c => c.id === newChat.id)) return old;
            return [newChat, ...currentList];
          });
        }).catch((err) => {
          console.warn('[Friend] Proactive startChat failed:', err);
        });
      }
    },
  });
};

export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
};

export const useUnfriend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unfriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: getBlockedUsers,
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      queryClient.setQueryData(["chats"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(c => c.recipientId !== userId);
      });
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

