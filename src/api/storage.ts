import { sharedApi } from '@/config/api';

export async function uploadToBucket(
  bucket: string,
  params: {
  path: string;
  uri: string;
  mimeType: string;
  fileName: string;
  },
): Promise<{ url?: string }> {
  const form = new FormData();
  form.append('path', params.path);
  form.append('file', {
    uri: params.uri,
    type: params.mimeType,
    name: params.fileName,
  } as any);

  const res = await sharedApi.post(`/admin/storage/upload/${bucket}`, form, {
    headers: {},
  });

  const url = (res.data as any)?.result?.url ?? (res.data as any)?.url;
  return typeof url === 'string' ? { url } : {};
}

export async function getStorageTestFileUrl(params: { bucket: string; path: string }): Promise<string> {
  // NOTE: this endpoint is marked as "Storage Test" in OpenAPI.
  // It's used as a temporary way to get a public URL.
  const urlPath = params.path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  const res = await sharedApi.get(`/storage-test/url/${params.bucket}/${urlPath}`);
  if (typeof res.data === 'string') return res.data;
  return String(res.data?.url ?? '');
}

