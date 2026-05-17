export const SHARED_API_URL =
  process.env.EXPO_PUBLIC_SHARED_API_URL || 'http://localhost:3000';

/** Origin без завершающего «/» — для Socket.IO и склейки URL (избегает `//order-chats`). */
export function getSharedApiOrigin(): string {
  return String(SHARED_API_URL || '').trim().replace(/\/+$/, '');
}

export const CAFE_API_URL =
  process.env.EXPO_PUBLIC_CAFE_API_URL || 'http://localhost:4000';

export const FILE_SYSTEM_URL =
  process.env.EXPO_PUBLIC_BACKEND_FILE_SYSTEM_URL ||
  process.env.BACKEND_FILE_SYSTEM_URL ||
  '';

