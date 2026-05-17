import { sharedApi } from '@/config/api';
import {
  jsonByteSize,
  logBooking,
  planPreviewStats,
  stripHeavyBookingPayload,
  warnBooking,
} from '@/utils/booking-debug';

export type RoomBillingMode = 'HOURLY' | 'MINUTE';

export type RoomBillingSettings = {
  hourlyEnabled: boolean;
  hourlyRateRub: number;
  minuteEnabled: boolean;
  minuteRateRub: number;
};

export type RoomAvailabilitySlot = {
  startAt: string;
  endAt: string;
};

export type RoomAvailability = {
  roomId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  capacity: number;
  workingHours?: unknown;
  billing?: RoomBillingSettings;
  billingModes?: RoomBillingMode[];
  slots: RoomAvailabilitySlot[];
};

export type SharedAssetOption = {
  id: string;
  name: string;
  description?: string;
  totalQuantity: number;
};

export type PlanPreviewZone = {
  roomId: string;
  name: string;
  points: Array<{ x: number; y: number }>;
  unassigned?: boolean;
};

export type PlanPreviewBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type PlanPreviewWall = { x1: number; y1: number; x2: number; y2: number };
export type PlanPreviewFurniture = {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  rotationDeg?: number;
  kind: string;
  name?: string;
  shape?: 'rect' | 'rounded' | 'oval';
  variant?: string;
  sofaStyle?: string;
  stairKind?: string;
  pairId?: string;
  pairRole?: 'up' | 'down';
  id?: string;
};
export type PlanPreviewSegment = { x1: number; y1: number; x2: number; y2: number };

export type PlanPreviewRasterImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export type PlanPreview = {
  planFieldM: { widthM: number; heightM: number };
  /** Server-rendered JPEG (~100–400 KB) — preferred on mobile */
  rasterImage?: PlanPreviewRasterImage | null;
  /** Omitted on mobile API — large base64 crashes the app */
  backgroundImage?: {
    dataUrl: string;
    x: number;
    y: number;
    widthM: number;
    heightM: number;
    opacity?: number;
  } | null;
  bounds?: PlanPreviewBounds;
  zones: PlanPreviewZone[];
  walls?: PlanPreviewWall[];
  furniture?: PlanPreviewFurniture[];
  openings?: PlanPreviewSegment[];
};

export type RoomAvailabilityResponse = {
  rooms: RoomAvailability[];
  sharedAssets: SharedAssetOption[];
  planPreview?: PlanPreview | null;
};

export type CafeOccupancy = {
  date: string;
  totalCapacity: number;
  totalAppointments: number;
  occupancyPercent: number;
  rooms: Array<{
    roomId: string;
    roomName: string;
    appointmentsCount: number;
    capacity: number;
    occupancyPercent: number;
  }>;
};

export type CafeOccupancyRange = {
  mode: 'range';
  from: string;
  to: string;
  days: Array<{
    date: string;
    occupancyPercent: number;
    totalCapacity: number;
    totalAppointments: number;
  }>;
  summary: { avgOccupancyPercent: number };
};

export async function getCafeOccupancyRange(cafeId: string, from: string, to: string) {
  const res = await sharedApi.get(`/cafe-layout/cafes/${cafeId}/occupancy`, {
    params: { from, to },
  });
  return res.data as CafeOccupancyRange;
}

export async function getCafeRoomAvailability(cafeId: string, date: string) {
  logBooking('availability request', { cafeId, date });
  const t0 = Date.now();
  const res = await sharedApi.get(`/cafe-layout/cafes/${cafeId}/rooms/availability`, {
    params: { date },
  });
  const raw = res.data as RoomAvailabilityResponse;
  const rawBytes = jsonByteSize(raw);
  const rawStats = planPreviewStats(raw.planPreview);
  if ((rawStats.dataUrlChars ?? 0) > 0) {
    warnBooking('availability raw plan still has dataUrl', rawStats);
  }
  const data = stripHeavyBookingPayload(raw);
  const cleanBytes = jsonByteSize(data);
  logBooking('availability ok', {
    ms: Date.now() - t0,
    rawBytes,
    cleanBytes,
    rooms: data.rooms?.length ?? 0,
    plan: planPreviewStats(data.planPreview),
  });
  return data;
}

export async function getCafeOccupancy(cafeId: string, date: string) {
  const res = await sharedApi.get(`/cafe-layout/cafes/${cafeId}/occupancy`, {
    params: { date },
  });
  return res.data as CafeOccupancy;
}
