import { sharedApi } from '@/config/api';

export type HealthCheckResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  data?: unknown;
};

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const startedAt = Date.now();

  try {
    const res = await sharedApi.get('/system/health-check');
    return {
      ok: true,
      status: res.status,
      durationMs: Date.now() - startedAt,
      data: res.data,
    };
  } catch (err: any) {
    const status = err?.response?.status ?? 0;
    const data = err?.response?.data;
    const message: string | undefined = err?.message;

    return {
      ok: false,
      status,
      durationMs: Date.now() - startedAt,
      data: data ?? (message ? { message } : undefined),
    };
  }
}

