import { sharedApi } from '@/config/api';
import axios from 'axios';
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

export async function uploadOrderChatAttachment(chatId: string, file: {
  uri: string;
  type: string;
  name: string;
}) {
  const formData = new FormData();
  formData.append('file', file as any);
  const url = `/order-chats/${chatId}/uploads`;
  const extractError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        timeout: error.config?.timeout,
      };
    }
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: String(error) };
  };
  const baseURL = String(sharedApi.defaults.baseURL || '').replace(/\/+$/, '');
  const accessToken = useAuthStore.getState().accessToken;
  const absoluteUrl = `${baseURL}${url}`;
  const requestInit: RequestInit = {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData as any,
  };

  try {
    const response = await fetch(absoluteUrl, requestInit);
    if (!response.ok) {
      const text = await response.text();
      console.error('[OrderChatAPI] upload failed with HTTP response', {
        chatId,
        file,
        status: response.status,
        statusText: response.statusText,
        body: text,
        request: { url: absoluteUrl, hasToken: Boolean(accessToken) },
      });
      throw new Error(`Upload failed with status ${response.status}`);
    }
    return (await response.json()) as { id: string; url: string };
  } catch (error) {
    console.error('[OrderChatAPI] upload failed at transport layer', {
      chatId,
      file,
      diagnostics: extractError(error),
      request: { url: absoluteUrl, hasToken: Boolean(accessToken) },
    });
    throw error;
  }
}

export async function sendOrderChatMessage(
  chatId: string,
  payload: { text?: string; attachmentIds?: string[] },
) {
  const res = await sharedApi.post<OrderChatMessage>(`/order-chats/${chatId}/messages`, payload);
  return res.data;
}
