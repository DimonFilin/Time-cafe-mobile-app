import { sharedApi } from '../config/api';

export type ScudCard = {
  guestId: string;
  status: 'DRAFT' | 'ACTIVE' | 'REFUSED';
  accessCardNumber: string | null;
  phone: string;
  firstName: string;
  lastName: string | null;
  patronymic: string | null;
  displayName: string;
  phoneVerified: boolean;
  canShowQr: boolean;
  qrPayload: string | null;
  loyaltyTier: { key: string; name: string; bonusPercent: number } | null;
  depositBalance: number;
  debt: number;
};

export async function getMyScudCard(): Promise<ScudCard> {
  const { data } = await sharedApi.get<ScudCard>('/users/me/scud-card');
  return data;
}
