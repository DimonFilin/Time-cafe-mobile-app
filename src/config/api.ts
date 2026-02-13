import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { refreshAccessToken } from '@/auth/session';
import { CAFE_API_URL, SHARED_API_URL } from '@/config/urls';
import { useAuthStore } from '@/store/authStore';

export const sharedApi = axios.create({
  baseURL: SHARED_API_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const cafeApi = axios.create({
  baseURL: CAFE_API_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

sharedApi.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

cafeApi.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean; _skipAuthRefresh?: boolean };

async function handle401(error: AxiosError) {
  const original = error.config as RetriableConfig | undefined;
  if (!original) throw error;
  if (original._retry) throw error;
  if (original._skipAuthRefresh) throw error;

  const url = String(original.url ?? '');
  if (url.includes('/auth/refresh')) throw error;

  const status = error.response?.status;
  if (status !== 401) throw error;

  original._retry = true;

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) throw error;

  original.headers = original.headers ?? {};
  original.headers.Authorization = `Bearer ${newAccessToken}`;

  const baseUrl = String(original.baseURL ?? '');
  if (baseUrl.includes(CAFE_API_URL)) {
    return cafeApi.request(original);
  }
  return sharedApi.request(original);
}

sharedApi.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => handle401(error)
);

cafeApi.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => handle401(error)
);