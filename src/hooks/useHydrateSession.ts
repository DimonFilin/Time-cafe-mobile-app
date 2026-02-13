import { useEffect, useState } from 'react';

import { me } from '@/api/auth';
import { loadPersistedTokens } from '@/auth/session';
import { useAuthStore } from '@/store/authStore';

export function useHydrateSession() {
  const [ready, setReady] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tokens = await loadPersistedTokens();
        if (!tokens) return;

        useAuthStore.setState({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });

        const user = await me();
        setSession({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSession]);

  return { ready };
}

