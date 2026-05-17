const TAG = '[Booking]';

export function logBooking(phase: string, payload?: Record<string, unknown>) {
  const line = payload ? `${TAG} ${phase} ${JSON.stringify(payload)}` : `${TAG} ${phase}`;
  console.log(line);
}

export function warnBooking(phase: string, payload?: Record<string, unknown>) {
  const line = payload ? `${TAG} ${phase} ${JSON.stringify(payload)}` : `${TAG} ${phase}`;
  console.warn(line);
}

export function errorBooking(phase: string, err: unknown, extra?: Record<string, unknown>) {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`${TAG} ${phase}`, { msg, stack, ...extra });
}

export function jsonByteSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export function planPreviewStats(preview: unknown) {
  if (!preview || typeof preview !== 'object') {
    return { hasPreview: false };
  }
  const p = preview as Record<string, unknown>;
  const bg = p.backgroundImage as Record<string, unknown> | null | undefined;
  const dataUrl = typeof bg?.dataUrl === 'string' ? bg.dataUrl : '';
  const raster = p.rasterImage as Record<string, unknown> | null | undefined;
  const rasterUrl = typeof raster?.dataUrl === 'string' ? raster.dataUrl : '';
  return {
    hasPreview: true,
    zones: Array.isArray(p.zones) ? p.zones.length : 0,
    walls: Array.isArray(p.walls) ? p.walls.length : 0,
    furniture: Array.isArray(p.furniture) ? p.furniture.length : 0,
    openings: Array.isArray(p.openings) ? p.openings.length : 0,
    hasBackground: Boolean(bg),
    dataUrlChars: dataUrl.length,
    hasRaster: Boolean(rasterUrl),
    rasterKb: rasterUrl ? Math.round(rasterUrl.length / 1024) : 0,
    bounds: p.bounds ?? null,
  };
}

/** Remove embedded rasters that crash Expo (OOM). */
export function stripHeavyBookingPayload<T>(data: T): T {
  return walkStrip(data) as T;
}

function walkStrip(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.length > 400) {
      warnBooking('strip inline dataUrl', { chars: value.length });
      return undefined;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(walkStrip).filter((v) => v !== undefined);
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'backgroundImage') continue;
      if (key === 'dataUrl') {
        if (typeof val === 'string' && val.startsWith('data:image/jpeg') && val.length < 600_000) {
          out[key] = val;
        }
        continue;
      }
      const next = walkStrip(val);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return value;
}
