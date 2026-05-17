import { sharedApi } from '@/config/api';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type Appointment = {
  id: string;
  cafeId: string;
  cafeName?: string;
  roomId?: string;
  roomName?: string;
  dateTime: string;
  duration: number;
  status: AppointmentStatus;
  qrCode?: string;
  totalAmount?: string;
  paymentMethod?: 'CARD' | 'BALANCE' | 'CASH' | 'FREE';
  notes?: string;
  roomSnapshot?: Record<string, unknown>;
  selectedAssets?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentListResponse = {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getMyAppointments(params?: {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  cafeId?: string;
  from?: string;
  to?: string;
}): Promise<AppointmentListResponse> {
  const res = await sharedApi.get('/appointments', { params });
  return res.data as AppointmentListResponse;
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const res = await sharedApi.get(`/appointments/${id}`);
  return res.data as Appointment;
}

export async function cancelAppointment(params: { id: string; reason?: string }): Promise<Appointment> {
  const res = await sharedApi.post(`/appointments/${params.id}/cancel`, {
    reason: params.reason,
  });
  return res.data as Appointment;
}

export async function createAppointment(input: {
  cafeId: string;
  roomId: string;
  dateTime: string;
  duration: number;
  billingMode?: 'HOURLY' | 'MINUTE';
  paymentMethod?: 'CARD' | 'BALANCE' | 'CASH' | 'FREE';
  cardId?: string;
  notes?: string;
  selectedSharedAssetIds?: string[];
}): Promise<Appointment> {
  const res = await sharedApi.post('/appointments', input);
  return res.data as Appointment;
}

