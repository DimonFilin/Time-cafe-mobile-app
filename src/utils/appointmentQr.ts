import type { Appointment } from '@/api/appointments';
import type { User } from '@/types';

export function buildAppointmentQrPayload(input: { appointment: Appointment; viewer: User | null }) {
  const { appointment, viewer } = input;

  return JSON.stringify(
    {
      v: 1,
      type: 'appointment',
      appointment: {
        id: appointment.id,
        cafeId: appointment.cafeId,
        cafeName: appointment.cafeName ?? null,
        dateTime: appointment.dateTime,
        duration: appointment.duration,
        status: appointment.status,
      },
      viewer: viewer
        ? {
            id: viewer.id,
            email: viewer.email,
          }
        : null,
    },
    null,
    0
  );
}

