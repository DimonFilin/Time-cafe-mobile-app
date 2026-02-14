function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const PALETTE = [
  '#111827', // gray-900
  '#1D4ED8', // blue-700
  '#0F766E', // teal-700
  '#7C3AED', // violet-600
  '#B45309', // amber-700
  '#BE123C', // rose-700
  '#15803D', // green-700
];

export function getStableColorFromId(id?: string | null): string {
  const raw = String(id || '').trim();
  if (!raw) return '#111827';
  const idx = hashString(raw) % PALETTE.length;
  return PALETTE[idx];
}

