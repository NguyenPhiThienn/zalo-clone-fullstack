import { useMutation } from "@tanstack/react-query";
import { register, RegisterPayload } from "@/api/auth";

export const useRegister = () => {
    return useMutation({
        mutationFn: (data: RegisterPayload) => register(data),
    });
};
