import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  accessToken: 'tc_access_token',
  refreshToken: 'tc_refresh_token',
} as const;

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

