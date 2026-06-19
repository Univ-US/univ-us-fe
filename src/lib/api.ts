// src/lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface SubscriptionAccessErrorResponse {
    code?: string;
    role?: string;
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

const refreshClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const isAuthApiRequest = (url?: string) => {
    return !!url && url.startsWith("/api/auth/");
};

const requestRefreshToken = async () => {
    if (!refreshPromise) {
        refreshPromise = refreshClient
            .post("/api/auth/refresh")
            .then(() => undefined)
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

api.interceptors.request.use(
    (config) => {
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        const responseData =
            error.response?.data as SubscriptionAccessErrorResponse | undefined;

        if (
            error.response?.status === 403 &&
            responseData?.code === "SUBSCRIPTION_EXPIRED"
        ) {
            if (
                typeof window !== "undefined" &&
                !window.location.pathname.startsWith("/subscribe")
            ) {
                window.location.href =
                    responseData.role === "ADM" ? "/subscribe" : "/unauthorized";
            }
            return Promise.reject(error);
        }

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        if (originalRequest._retry || isAuthApiRequest(originalRequest.url)) {
            return Promise.reject(error);
        }

        try {
            originalRequest._retry = true;
            await requestRefreshToken();
            return api(originalRequest);
        } catch (refreshError) {
            if (typeof window !== "undefined") {
                const isAdminPath =
                    window.location.pathname.startsWith("/service-admin") ||
                    window.location.pathname.startsWith("/dashboard");
                window.location.href = isAdminPath ? "/login" : "/home/login";
            }

            return Promise.reject(refreshError);
        }
    }
);

export default api;
