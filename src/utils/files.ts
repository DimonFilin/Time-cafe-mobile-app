import { FILE_SYSTEM_URL, SHARED_API_URL } from '@/config/urls';

function trimSlashEnd(v: string) {
  return v.replace(/\/+$/, '');
}

function getDerivedFileSystemBase(): string | null {
  const raw = String(SHARED_API_URL || '').trim();
  if (!raw) return null;

  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `http://${raw}`;
  try {
    const u = new URL(withProto);
    // In dev we expect MinIO on the same host at :9000
    return `${u.protocol}//${u.hostname}:9000`;
  } catch {
    return null;
  }
}

export function resolveFileUrl(input?: string | null): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const base =
    trimSlashEnd(String(FILE_SYSTEM_URL || '').trim()) ||
    trimSlashEnd(String(getDerivedFileSystemBase() || '').trim());
  if (!base) return raw;

  // Most common dev issue: backend returns MinIO URL with localhost.
  // Replace origin with derived FS base (or explicit FILE_SYSTEM_URL).
  const replaced = raw
    .replace(/^https?:\/\/localhost:9000/i, base)
    .replace(/^https?:\/\/127\.0\.0\.1:9000/i, base);

  return replaced;
}

