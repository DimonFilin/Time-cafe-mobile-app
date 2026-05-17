import type { PlanPreviewZone } from '@/api/cafe-layout';

export type FitLayout = {
  displayW: number;
  displayH: number;
  originX: number;
  originY: number;
};

export function planToLocalNorm(
  px: number,
  py: number,
  minX: number,
  minY: number,
  planW: number,
  planH: number,
) {
  return {
    x: (px - minX) / planW,
    y: (py - minY) / planH,
  };
}

export function zoneBoundsNorm(zone: PlanPreviewZone, minX: number, minY: number, planW: number, planH: number) {
  let minPx = Infinity;
  let minPy = Infinity;
  let maxPx = -Infinity;
  let maxPy = -Infinity;
  for (const p of zone.points) {
    minPx = Math.min(minPx, p.x);
    minPy = Math.min(minPy, p.y);
    maxPx = Math.max(maxPx, p.x);
    maxPy = Math.max(maxPy, p.y);
  }
  const a = planToLocalNorm(minPx, minPy, minX, minY, planW, planH);
  const b = planToLocalNorm(maxPx, maxPy, minX, minY, planW, planH);
  return {
    left: a.x,
    top: a.y,
    width: Math.max(0.02, b.x - a.x),
    height: Math.max(0.02, b.y - a.y),
  };
}

export function zoneCenterNorm(zone: PlanPreviewZone, minX: number, minY: number, planW: number, planH: number) {
  const c = zone.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  const n = zone.points.length || 1;
  return planToLocalNorm(c.x / n, c.y / n, minX, minY, planW, planH);
}

const METERS_PER_PX = 0.1 / 20;

export function polygonAreaSqM(points: Array<{ x: number; y: number }>) {
  if (points.length < 3) return null;
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += points[j].x * points[i].y - points[i].x * points[j].y;
  }
  const px2 = Math.abs(sum) / 2;
  const m2 = px2 * METERS_PER_PX * METERS_PER_PX;
  return Number.isFinite(m2) ? m2 : null;
}

export function zoneCenter(zone: PlanPreviewZone) {
  const c = zone.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  const n = zone.points.length || 1;
  return { x: c.x / n, y: c.y / n };
}

export function computeFitLayout(
  canvasW: number,
  canvasH: number,
  planW: number,
  planH: number,
): FitLayout | null {
  if (!canvasW || !canvasH || !planW || !planH) return null;
  const fit = Math.min(canvasW / planW, canvasH / planH) * 0.94;
  const displayW = planW * fit;
  const displayH = planH * fit;
  return {
    displayW,
    displayH,
    originX: (canvasW - displayW) / 2,
    originY: (canvasH - displayH) / 2,
  };
}
