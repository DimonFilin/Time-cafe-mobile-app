import { sharedApi } from '@/config/api';
import { SHARED_API_URL } from '@/config/urls';
import { refreshAccessToken } from '@/auth/session';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
};

export type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const res = await sharedApi.post('/auth/register', input);
  return res.data as AuthResponse;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const res = await sharedApi.post('/auth/login', input);
  return res.data as AuthResponse;
}

export async function me(): Promise<User> {
  const res = await sharedApi.get('/auth/me');
  return res.data as User;
}

export type UpdateMeInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
};

export async function updateMe(input: UpdateMeInput): Promise<User> {
  const res = await sharedApi.patch('/auth/me', input);
  return res.data as User;
}

export async function getMyAvatarSignedUrl(): Promise<{ url: string | null }> {
  const res = await sharedApi.get('/auth/me/avatar-url');
  return res.data as { url: string | null };
}

export async function uploadMyAvatar(params: {
  uri: string;
  fileName: string;
  mimeType: string;
}): Promise<User> {
  async function doUpload(accessToken: string): Promise<User> {
    let fileUri = params.uri;

    // Some Android pickers return content:// which is not uploadable by FileSystem.uploadAsync.
    if (fileUri.startsWith('content://')) {
      const tmpPath = `${FileSystem.cacheDirectory}avatar-${Date.now()}-${params.fileName}`.replace(
        /[^\w.\-/]+/g,
        '-',
      );
      await FileSystem.copyAsync({ from: fileUri, to: tmpPath });
      fileUri = tmpPath;
    }

    const res = await FileSystem.uploadAsync(
      `${SHARED_API_URL}/auth/me/avatar`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: params.mimeType,
        parameters: {},
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Upload failed (${res.status})`);
    }

    try {
      return JSON.parse(res.body) as User;
    } catch {
      throw new Error('Failed to parse upload response');
    }
  }

  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) throw new Error('Not authenticated');

  try {
    return await doUpload(accessToken);
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      const refreshed = await refreshAccessToken();
      if (!refreshed) throw new Error('Not authenticated');
      return await doUpload(refreshed);
    }
    throw e;
  }
}

