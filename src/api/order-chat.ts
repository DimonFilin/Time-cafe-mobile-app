import * as FileSystem from 'expo-file-system/legacy';

import { refreshAccessToken } from '@/auth/session';
import { sharedApi } from '@/config/api';
import { SHARED_API_URL } from '@/config/urls';
import { useAuthStore } from '@/store/authStore';

export interface OrderChatMessage {
  id: string;
  chatId: string;
  authorType: 'USER' | 'WORKER';
  text?: string | null;
  attachments: Array<{ id: string; url: string }>;
  createdAt: string;
}

export interface OrderChatSummary {
  id: string;
  orderId: string;
  isEnabled: boolean;
}

export async function getOrderChatByOrder(orderId: string) {
  const res = await sharedApi.get<OrderChatSummary>(`/order-chats/by-order/${orderId}`);
  return res.data;
}

export async function getOrderChatMessages(chatId: string) {
  const res = await sharedApi.get<{ items: OrderChatMessage[] }>(`/order-chats/${chatId}/messages?limit=100`);
  return res.data.items;
}

function sharedApiOrigin(): string {
  return String(SHARED_API_URL || '').replace(/\/+$/, '');
}

/**
 * Загрузка вложения: в RN `fetch`+multipart часто даёт «Network request failed»;
 * тот же путь, что для аватара — `FileSystem.uploadAsync` (стабильнее на Android).
 */
export async function uploadOrderChatAttachment(chatId: string, file: {
  uri: string;
  type: string;
  name: string;
}): Promise<{ id: string; url: string }> {
  const url = `${sharedApiOrigin()}/order-chats/${chatId}/uploads`;

  async function resolveUploadableUri(): Promise<string> {
    let fileUri = file.uri;
    if (fileUri.startsWith('content://')) {
      const safeName = file.name.replace(/[^\w.\-]+/g, '-') || 'image.jpg';
      const tmpPath = `${FileSystem.cacheDirectory}order-chat-${Date.now()}-${safeName}`;
      await FileSystem.copyAsync({ from: fileUri, to: tmpPath });
      fileUri = tmpPath;
    }
    return fileUri;
  }

  async function doUpload(accessToken: string): Promise<{ id: string; url: string }> {
    const fileUri = await resolveUploadableUri();
    const res = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.type,
      parameters: {},
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Upload failed (${res.status}): ${String(res.body).slice(0, 400)}`);
    }
    try {
      return JSON.parse(res.body) as { id: string; url: string };
    } catch {
      throw new Error('Failed to parse upload response');
    }
  }

  let accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  try {
    return await doUpload(accessToken);
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      const next = await refreshAccessToken();
      if (!next) throw new Error('Session expired');
      accessToken = next;
      return await doUpload(accessToken);
    }
    console.error('[OrderChatAPI] upload failed', {
      chatId,
      file: { name: file.name, type: file.type },
      request: { url },
      error: e,
    });
    throw e;
  }
}

export async function sendOrderChatMessage(
  chatId: string,
  payload: { text?: string; attachmentIds?: string[] },
) {
  const res = await sharedApi.post<OrderChatMessage>(`/order-chats/${chatId}/messages`, payload);
  return res.data;
}
