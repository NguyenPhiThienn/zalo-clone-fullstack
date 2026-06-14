import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactToMessage, reactToGroupMessage, removeReaction, removeGroupReaction } from "@/api/reaction";
import { useAuthStore } from "@/store";

export const useReactToMessage = (chatId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactToMessage(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["messages", chatId, 0] });

      const currentUser = useAuthStore.getState().user;
      const myId = (currentUser as any)?.id || "me";
      const myName = (currentUser as any)?.name || (currentUser as any)?.firstName || "Bạn";

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["messages", chatId, 0]);

      // Optimistically update the cache
      queryClient.setQueryData(["messages", chatId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((m: any) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions || [];
          const myReactionIdx = existing.findIndex((r: any) => r.userId === myId || r.userId === 'me');

          let newReactions = [...existing];
          if (myReactionIdx >= 0) {
            // Đã có reaction của mình
            if (existing[myReactionIdx].emoji === emoji) {
              // Trùng emoji → toggle off (xóa reaction của mình)
              newReactions.splice(myReactionIdx, 1);
            } else {
              // Khác emoji → cập nhật emoji mới
              newReactions[myReactionIdx] = {
                ...newReactions[myReactionIdx],
                emoji: emoji
              };
            }
          } else {
            // Chưa có reaction của mình → thêm mới
            newReactions.push({
              emoji,
              userId: myId,
              userFullName: myName
            });
          }

          return { ...m, reactions: newReactions };
        });
      });

      return { previousMessages };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["messages", chatId, 0], (oldMessages: any[] | undefined) => {
        if (!oldMessages) return oldMessages;
        return oldMessages.map((m: any) =>
          m.id === variables.messageId ? { ...m, reactions: data } : m
        );
      });
    },
    onError: (err, variables, context) => {
      // Rollback to snapshot if mutation fails
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", chatId, 0], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    }
  });
};

export const useReactToGroupMessage = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactToGroupMessage(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['group-messages', groupId, 0] });

      const currentUser = useAuthStore.getState().user;
      const myId = (currentUser as any)?.id || "me";
      const myName = (currentUser as any)?.name || (currentUser as any)?.firstName || "Bạn";

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['group-messages', groupId, 0]);

      // Optimistically update the cache
      queryClient.setQueryData(['group-messages', groupId, 0], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((m: any) => {
          if (m.id !== messageId) return m;
          const existing = m.reactions || [];
          const myReactionIdx = existing.findIndex((r: any) => r.userId === myId || r.userId === 'me');

          let newReactions = [...existing];
          if (myReactionIdx >= 0) {
            // Đã có reaction của mình
            if (existing[myReactionIdx].emoji === emoji) {
              // Trùng emoji → toggle off
              newReactions.splice(myReactionIdx, 1);
            } else {
              // Khác emoji → cập nhật
              newReactions[myReactionIdx] = {
                ...newReactions[myReactionIdx],
                emoji: emoji
              };
            }
          } else {
            // Chưa có reaction → thêm mới
            newReactions.push({
              emoji,
              userId: myId,
              userFullName: myName
            });
          }

          return { ...m, reactions: newReactions };
        });
      });

      return { previousMessages };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['group-messages', groupId, 0], (oldMessages: any[] | undefined) => {
        if (!oldMessages) return oldMessages;
        return oldMessages.map((m: any) =>
          m.id === variables.messageId ? { ...m, reactions: data } : m
        );
      });
    },
    onError: (err, variables, context) => {
      // Rollback to snapshot if mutation fails
      if (context?.previousMessages) {
        queryClient.setQueryData(['group-messages', groupId, 0], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId, 0] });
    }
  });
};
