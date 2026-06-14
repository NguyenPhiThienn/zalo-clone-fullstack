import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store";
import { Platform } from "react-native";

export interface UploadResponse {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const useUpload = () => {
  const { token } = useAuthStore.getState();

  const uploadMutation = useMutation({
    mutationFn: async (uri: string): Promise<UploadResponse> => {
      console.log(`🚀 [useUpload] Starting upload for: ${uri.substring(0, 40)}...`);

      const filename = uri.split("/").pop() || `image_${Date.now()}.jpg`;
      const extension = filename.split(".").pop()?.toLowerCase() || "jpg";
      const type = extension === "jpg" ? "image/jpeg" : `image/${extension}`;

      const formData = new FormData();
      const finalUri = Platform.OS === "android" ? uri : uri.replace("file://", "");

      // @ts-ignore
      formData.append("file", {
        uri: finalUri,
        name: filename,
        type: type,
      });

      const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL || "https://Zalo-backend.onrender.com/api/v1";
      const url = `${baseUrl}/upload`;

      // Retry mechanism for weak servers (Render Free)
      const tryUpload = async (attempt: number): Promise<UploadResponse> => {
        try {
          console.log(`📡 [useUpload] Attempt ${attempt} calling fetch to: ${url}`);
          const response = await fetch(url, {
            method: "POST",
            body: formData,
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json",
              // We intentionally omit Content-Type here to let fetch generate it with the correct boundary
              // Some servers/proxies fail without boundary or if boundary is malformed.
            },
          });

          console.log(`📡 [useUpload] Attempt ${attempt} Status: ${response.status}`);

          const responseData = await response.json();

          if (response.ok) {
            const result = responseData.data?.data || responseData.data || responseData;
            return result;
          } else {
            throw new Error(responseData.message || `Server Error ${response.status}`);
          }
        } catch (err) {
          if (attempt < 2) { // Try up to 2 times
            console.warn(`⚠️ [useUpload] Attempt ${attempt} failed. Retrying in 1.5s...`, err);
            await new Promise(res => setTimeout(res, 1500));
            return tryUpload(attempt + 1);
          }
          throw err;
        }
      };

      return tryUpload(1);
    },
  });

  return {
    uploadImage: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error ? (uploadMutation.error as any).message : null,
  };
};
