import { useAuthStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { showLogoutAlert } from "./logout-guard";

export const fetchAPI = async (url: string, options?: RequestInit) => {
    try {
        let finalUrl = url;
        const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL || "https://Zalo-backend.onrender.com/api/v1";
        const { token } = useAuthStore.getState();

        if (url.startsWith('/')) {
            // Remove /(api) if it exists, as the remote API likely doesn't have it
            if (url.startsWith('/(api)')) {
                finalUrl = `${baseUrl}${url.replace('/(api)', '')}`;
            } else {
                finalUrl = `${baseUrl}${url}`;
            }
        }

        // React Native's FormData often has a _parts property
        const isFormData = options?.body instanceof FormData || (options?.body && typeof options.body === 'object' && '_parts' in options.body);

        const headers: Record<string, string> = {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options?.headers as Record<string, string>,
        };

        // IMPORTANT: For FormData, we must let fetch set the Content-Type header 
        // with the correct boundary. Setting it manually (like application/json) 
        // or leaving it empty if it was somehow set before will break it.
        if (isFormData) {
            delete headers['Content-Type'];
        } else if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        console.log(`📡 [fetchAPI] Request: ${options?.method || 'GET'} ${finalUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(finalUrl, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`⚠️ [fetchAPI] HTTP ${response.status}:`, errorText);

            if (response.status === 401 && !url.includes('/auth/')) {
                console.warn("🚨 [fetchAPI] 401 Unauthorized detected! Token expired or replaced. Logging out...");
                
                // Show notification BEFORE logging out
                showLogoutAlert(
                  "Phiên đăng nhập hết hạn", 
                  "Tài khoản của bạn đã được đăng nhập ở thiết bị khác hoặc phiên đã hết hạn.",
                  () => {
                    useAuthStore.getState().logout();
                    setTimeout(() => {
                        router.replace("/(auth)/sign-in");
                    }, 0);
                  }
                );
            }
            // Parse error message for custom errors like incorrect credentials
            let parsedError = errorText;
            try {
                const jsonObj = JSON.parse(errorText);
                parsedError = jsonObj.error || jsonObj.message || errorText;
            } catch (e) {}
            throw new Error(parsedError);
        }

        const text = await response.text();
        if (!text) {
            return null; // Trả về null nếu body trống (VD: DELETE 200 OK)
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn('⚠️ [fetchAPI] JSON parse error on JSON content type:', e);
                return text;
            }
        }

        try {
            return JSON.parse(text);
        } catch (parseError) {
            return text;
        }
    } catch (error) {
        throw error;
    }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
    const { data, error, isLoading, refetch } = useQuery<T, Error>({
        queryKey: [url, options],
        queryFn: async () => {
            const result = await fetchAPI(url, options);
            return result.data ?? result;
        },
    });

    return {
        data,
        loading: isLoading,
        error: error?.message || null,
        refetch
    };
};