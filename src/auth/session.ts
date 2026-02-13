import axios from 'axios';

import { SHARED_API_URL } from '@/config/urls';
import { useAuthStore } from '@/store/authStore';
import { STORAGE_KEYS, deleteItem, getItem, setItem } from '@/storage/secureStore';

let refreshPromise: Promise<string | null> | null = null;

export async function persistSession(tokens: { accessToken: string; refreshToken: string }) {
  await Promise.all([
    setItem(STORAGE_KEYS.accessToken, tokens.accessToken),
    setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken),
  ]);
}

export async function clearPersistedSession() {
  await Promise.all([
    deleteItem(STORAGE_KEYS.accessToken),
    deleteItem(STORAGE_KEYS.refreshToken),
  ]);
}

export async function loadPersistedTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(STORAGE_KEYS.accessToken),
    getItem(STORAGE_KEYS.refreshToken),
  ]);

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken =
      useAuthStore.getState().refreshToken ?? (await getItem(STORAGE_KEYS.refreshToken));
    if (!refreshToken) return null;

    try {
      const res = await axios
        .create({
          baseURL: SHARED_API_URL,
          timeout: 8000,
          headers: { 'Content-Type': 'application/json' },
        })
        .post('/auth/refresh', { refreshToken });

      const data = res.data as {
        accessToken: string;
        refreshToken: string;
        user: any;
      };

      useAuthStore.getState().setSession({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      await persistSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch {
      useAuthStore.getState().logout();
      await clearPersistedSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

