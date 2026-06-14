// hooks/useProfile.ts — Đồng bộ với UserController backend
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  updateMyProfile,
  UserDto,
  UpdateProfilePayload,
} from "@/api/user";

export type { UpdateProfilePayload };

/** Lấy profile của người dùng hiện tại */
export const useProfile = () => {
  return useQuery<UserDto>({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    retry: 1,
  });
};

/** Cập nhật profile */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
