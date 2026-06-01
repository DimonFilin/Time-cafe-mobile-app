import { FILE_SYSTEM_URL, SHARED_API_URL } from '@/config/urls';

const KNOWN_BUCKETS = new Set(['cafes', 'users', 'brands', 'public']);

function trimSlashEnd(v: string) {
  return v.replace(/\/+$/, '');
}

function getDerivedFileSystemBase(): string | null {
  const raw = String(SHARED_API_URL || '').trim();
  if (!raw) return null;

  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `http://${raw}`;
  try {
    const u = new URL(withProto);
    return `${u.protocol}//${u.hostname}:9000`;
  } catch {
    return null;
  }
}

function fileSystemBase(): string | null {
  return (
    trimSlashEnd(String(FILE_SYSTEM_URL || '').trim()) ||
    trimSlashEnd(String(getDerivedFileSystemBase() || '').trim()) ||
    null
  );
}

function isPresignedS3Url(raw: string): boolean {
  return /[?&]X-Amz-/i.test(raw) || /[?&]x-amz-/i.test(raw);
}

/** Admin Next proxy: /api/media-s3/{bucket}/key... */
function tryParseMediaS3ProxyUrl(raw: string): { bucket: string; key: string } | null {
  const m = raw.match(/\/api\/media-s3\/(cafes|users|brands|public)\/(.+)$/i);
  if (!m) return null;
  const key = decodeURIComponent(m[2].replace(/\?.*$/, ''));
  return { bucket: m[1], key };
}

/** MinIO path-style: http(s)://host:port/bucket/key... */
function tryParseMinioPathStyleUrl(raw: string): { bucket: string; key: string } | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const segs = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segs.length < 2) return null;
  const bucket = segs[0];
  if (!KNOWN_BUCKETS.has(bucket)) return null;
  return { bucket, key: segs.slice(1).join('/') };
}

function replaceUnreachableOrigin(url: string, base: string): string {
  return url
    .replace(/^https?:\/\/localhost(?::\d+)?/i, base)
    .replace(/^https?:\/\/127\.0\.0\.1(?::\d+)?/i, base);
}

const STORAGE_PATH_RE = /^(users|public|brands|cafes)\//i;

/**
 * Turns backend storage refs and MinIO URLs into a URL the phone can load.
 * Presigned URLs are returned as-is (host rewrite breaks SigV4). Prefer order-chat attachment API for chat images.
 */
export function resolveFileUrl(input?: string | null): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;

  const base = fileSystemBase();

  if (STORAGE_PATH_RE.test(raw)) {
    return base ? `${base}/${raw}` : null;
  }

  const proxy = tryParseMediaS3ProxyUrl(raw);
  if (proxy && base) {
    return `${base}/${proxy.bucket}/${proxy.key}`;
  }

  const minio = tryParseMinioPathStyleUrl(raw);
  if (minio && base && !isPresignedS3Url(raw)) {
    return `${base}/${minio.bucket}/${minio.key}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    if (isPresignedS3Url(raw)) {
      return raw;
    }
    return base ? replaceUnreachableOrigin(raw, base) : raw;
  }

  if (!base) return null;
  return `${base}/${raw.replace(/^\/+/, '')}`;
}
