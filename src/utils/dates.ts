import { format, parseISO } from 'date-fns';

export function formatDateTime(iso: string | undefined, pattern = 'yyyy-MM-dd HH:mm'): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function toIsoFromLocal(date: string, time: string): string | null {
  const mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const mTime = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!mDate || !mTime) return null;

  const y = Number(mDate[1]);
  const mo = Number(mDate[2]);
  const d = Number(mDate[3]);
  const hh = Number(mTime[1]);
  const mm = Number(mTime[2]);

  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;

  const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;

  return dt.toISOString();
}

