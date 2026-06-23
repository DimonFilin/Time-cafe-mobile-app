import type { Appointment } from '@/api/appointments';
import type { User } from '@/types';

export function buildAppointmentQrPayload(input: { appointment: Appointment; viewer: User | null }) {
  const { appointment, viewer } = input;

  // Keep payload minimal for reliable barcode scanner reads.
  // Short keys are intentional.
  return JSON.stringify({
    v: 1, // version
    t: 'a', // type: appointment
    a: String(appointment.id),
    u: viewer?.id ? String(viewer.id) : null,
    c: String(appointment.cafeId),
    n: appointment.cafeName ? String(appointment.cafeName) : null,
  });
}

