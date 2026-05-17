export type RoomBillingMode = 'HOURLY' | 'MINUTE';

export type RoomBillingSettings = {
  hourlyEnabled: boolean;
  hourlyRateRub: number;
  minuteEnabled: boolean;
  minuteRateRub: number;
};

export const DEFAULT_ROOM_BILLING: RoomBillingSettings = {
  hourlyEnabled: true,
  hourlyRateRub: 250,
  minuteEnabled: true,
  minuteRateRub: 7,
};

export function parseRoomBilling(raw: unknown): RoomBillingSettings {
  const b =
    raw && typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : null;
  if (!b) return { ...DEFAULT_ROOM_BILLING };
  return {
    hourlyEnabled: b.hourlyEnabled !== false,
    hourlyRateRub: Math.max(0, Number(b.hourlyRateRub) || DEFAULT_ROOM_BILLING.hourlyRateRub),
    minuteEnabled: b.minuteEnabled !== false,
    minuteRateRub: Math.max(0, Number(b.minuteRateRub) || DEFAULT_ROOM_BILLING.minuteRateRub),
  };
}

export function billingModesAvailable(settings: RoomBillingSettings): RoomBillingMode[] {
  const modes: RoomBillingMode[] = [];
  if (settings.hourlyEnabled) modes.push('HOURLY');
  if (settings.minuteEnabled) modes.push('MINUTE');
  return modes;
}

export function calculateRoomBookingPrice(
  durationMinutes: number,
  mode: RoomBillingMode,
  settings: RoomBillingSettings,
): number {
  const duration = Math.max(15, Math.min(480, Math.round(durationMinutes)));
  if (mode === 'HOURLY') {
    const hours = Math.ceil(duration / 60);
    return Math.round(hours * settings.hourlyRateRub * 100) / 100;
  }
  return Math.round(duration * settings.minuteRateRub * 100) / 100;
}

export function isRoomSlotFree(
  slots: Array<{ startAt: string; endAt: string }>,
  startIso: string,
  durationMin: number,
): boolean {
  const start = new Date(startIso).getTime();
  const end = start + durationMin * 60000;
  return !slots.some((s) => {
    const bs = new Date(s.startAt).getTime();
    const be = new Date(s.endAt).getTime();
    return start < be && bs < end;
  });
}
