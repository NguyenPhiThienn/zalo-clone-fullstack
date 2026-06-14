import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGroups, createGroup, sendGroupMessage, uploadGroupMedia,
  getGroupById, getGroupMessages, recallGroupMessage, deleteGroupMessageForMe,
  updateGroup, uploadGroupAvatar, addGroupMembers, removeGroupMember,
  setGroupAdmin, leaveGroup, dissolveGroup,
  pinGroupMessage, unpinGroupMessage, getPinnedGroupMessages, getGroupMedia,
  getJoinRequests, approveJoinRequest, rejectJoinRequest, createJoinRequests,
  GroupMessageDto
} from "@/api/group";
import { useAuthStore } from "@/store";
import { nextSortOrder } from "@/lib/sortCounter";

export const useMyGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: getMyGroups,
    // staleTime: Infinity — Socket cập nhật list real-time qua setQueryData.
    // Chỉ refetch khi user kéo refresh thủ công.
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useGroupById = (groupId: string | null) => {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId!),
    enabled: !!groupId,
  });
};

export const useGroupMessages = (groupId: string | null, page = 0, size = 30) => {
  return useQuery({
    queryKey: ["group-messages", groupId, page],
    queryFn: () => getGroupMessages(groupId!, page, size),
    enabled: !!groupId,
    staleTime: 60_000,
  });
};

export const useSendGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { content?: string; type?: string; mentionedUserIds?: string[]; mentionAll?: boolean; replyToId?: string; replyTo?: any }) => sendGroupMessage(groupId, payload),
    onMutate: async (payload) => {
      const user = useAuthStore.getState().user;
      const tempId = 'temp-' + Date.now();

      // 1. Cập nhật Preview ngầm ở Home
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        const newList = [...old];
        const index = newList.findIndex(g => g.id === groupId);
        if (index !== -1) {
          newList[index] = {
            ...newList[index],
            lastMessage: payload.content,
            lastMessageTime: new Date().toISOString(),
            lastMessageSenderName: "Bạn",
            _sortOrder: nextSortOrder(),
          };
          newList.unshift(newList.splice(index, 1)[0]);
        }
        return newList;
      });

      // 2. Chèn tin nhắn tạm vào danh sách
      queryClient.setQueryData(["group-messages", groupId, 0], (old: any[] | undefined) => {
        const current = old || [];
        const newMessage: GroupMessageDto = {
          id: tempId,
          content: payload.content,
          senderId: (user as any)?.id,
          senderName: (user as any)?.name || "Bạn",
          createdDate: new Date().toISOString(),
          type: (payload.type as any) || 'TEXT',
          deleted: false,
          pinned: false,
          reactions: [],
          replyTo: (payload as any).replyTo,
        };
        return [newMessage, ...current];
      });

      return { tempId };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["group-messages", groupId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        const alreadyExists = old.some(m => m.id === data.id);
        if (alreadyExists) return old.filter(m => m.id !== context?.tempId);
        return old.map(m => m.id === context?.tempId ? data : m);
      });
    },
  });
};

export const useUploadGroupMedia = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { formData: FormData, localUri: string, fileType: string, fileName: string, replyTo?: any }) =>
      uploadGroupMedia(groupId, data.formData),
    onMutate: async (variables) => {
      const user = useAuthStore.getState().user;
      const tempId = 'temp-media-' + Date.now();

      // 1. Cập nhật Preview Home
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        const newList = [...old];
        const index = newList.findIndex(g => g.id === groupId);
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

      // 2. Chèn tin nhắn media tạm thời
      queryClient.setQueryData(["group-messages", groupId, 0], (old: any[] | undefined) => {
        const current = old || [];
        const isImage = variables.fileType.startsWith('image');
        const newMessage: GroupMessageDto = {
          id: tempId,
          content: variables.fileName,
          mediaUrl: variables.localUri,
          senderId: (user as any)?.id,
          senderName: (user as any)?.name || "Bạn",
          createdDate: new Date().toISOString(),
          type: (isImage ? 'IMAGE' : (variables.fileType.startsWith('video') ? 'VIDEO' : 'FILE')) as any,
          deleted: false,
          pinned: false,
          reactions: [],
          replyTo: variables.replyTo,
        };
        return [newMessage, ...current];
      });

      return { tempId };
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(["group-messages", groupId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        const alreadyExists = old.some(m => m.id === data.id);
        if (alreadyExists) return old.filter(m => m.id !== context?.tempId);
        return old.map(m => m.id === context?.tempId ? data : m);
      });
    },
  });
};

export const useRecallGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => recallGroupMessage(groupId, messageId),
    onMutate: async (messageId) => {
      const user = useAuthStore.getState().user;
      const senderName = (user as any)?.name || (user as any)?.firstName || "Bạn";
      queryClient.setQueryData(['group-messages', groupId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((m: any) => m.id === messageId
          ? { ...m, deleted: true, content: `Tin nhắn đã được ${senderName} thu hồi`, text: `Tin nhắn đã được ${senderName} thu hồi` }
          : m
        );
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, 0] });
    },
  });
};

export const useDeleteGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteGroupMessageForMe(groupId, messageId),
    onMutate: async (messageId) => {
      queryClient.setQueryData(['group-messages', groupId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter((m: any) => m.id !== messageId);
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, 0] });
    },
  });
};

export const useUpdateGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateGroup(groupId, { name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(g => String(g.id) === String(groupId) ? { ...g, name: data.name } : g);
      });
    },
  });
};

export const useUploadGroupAvatar = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadGroupAvatar(groupId, formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(g => String(g.id) === String(groupId) ? { ...g, avatarUrl: data.avatarUrl } : g);
      });
    },
  });
};

export const useAddGroupMembers = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => addGroupMembers(groupId, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
};

export const useRemoveGroupMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
};

export const useSetGroupAdmin = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => setGroupAdmin(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, newAdminId }: { groupId: string; newAdminId?: string }) => leaveGroup(groupId, newAdminId),
    onSuccess: (data, variables) => {
      // Xóa trực tiếp khỏi cache tránh Redis cache cũ ghi đè
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(g => String(g.id) !== String(variables.groupId));
      });
    },
  });
};

export const useDissolveGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => dissolveGroup(groupId),
    onSuccess: (data, groupId) => {
      // Xóa trực tiếp khỏi cache tránh Redis cache cũ ghi đè
      queryClient.setQueryData(["groups"], (old: any[] | undefined) => {
        if (!old) return old;
        return old.filter(g => String(g.id) !== String(groupId));
      });
    },
  });
};

export const usePinnedGroupMessages = (groupId: string) => {
  return useQuery({
    queryKey: ["pinned-messages", groupId],
    queryFn: () => getPinnedGroupMessages(groupId),
    enabled: !!groupId,
  });
};

export const usePinGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => pinGroupMessage(groupId, messageId),
    onSuccess: (data) => {
      queryClient.setQueryData(["pinned-messages", groupId], data);
    },
  });
};

export const useUnpinGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => unpinGroupMessage(groupId, messageId),
    onSuccess: (data) => {
      queryClient.setQueryData(["pinned-messages", groupId], data);
    },
  });
};

export const useGroupMedia = (groupId: string) => {
  return useQuery({
    queryKey: ["group-media", groupId],
    queryFn: () => getGroupMedia(groupId),
    enabled: !!groupId,
  });
};

export const useJoinRequests = (groupId: string) => {
  return useQuery({
    queryKey: ["join-requests", groupId],
    queryFn: () => getJoinRequests(groupId),
    enabled: !!groupId,
  });
};

export const useApproveJoinRequest = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => approveJoinRequest(groupId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
};

export const useRejectJoinRequest = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => rejectJoinRequest(groupId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", groupId] });
    },
  });
};

export const useCreateJoinRequests = (groupId: string) => {
  return useMutation({
    mutationFn: (userIds: string[]) => createJoinRequests(groupId, userIds),
  });
};
