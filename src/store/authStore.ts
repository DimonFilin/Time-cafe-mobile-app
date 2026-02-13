import { create } from 'zustand';

import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (session: { user: User; accessToken: string; refreshToken: string }) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setSession: ({ user, accessToken, refreshToken }) =>
    set({ user, accessToken, refreshToken, isAuthenticated: true }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));




