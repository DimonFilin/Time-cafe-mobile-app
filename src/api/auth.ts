import { sharedApi } from '@/config/api';
import type { User } from '@/types';

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

