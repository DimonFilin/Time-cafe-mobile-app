import { sharedApi } from '../config/api';

export type GuestWallet = {
  depositBalance: number;
  debt: number;
  pendingBonusTotal: number;
  pendingBonuses: Array<{
    id: string;
    bonusAmount: string;
    scheduledAt: string;
    topUpAmount: string;
  }>;
  loyaltyTier: { name: string; bonusPercent: string } | null;
  loyaltyWelcomeShownAt: string | null;
  phoneVerifiedAt?: string | null;
  accessCardNumber?: string | null;
  loyaltyWelcomeEligible?: boolean;
};

export type TopUpPreview = {
  amount: number;
  tierName: string;
  bonusPercent: number;
  hypotheticBonus: number;
  scheduledAt: string;
  willAccrue: boolean;
  reasonIfNot: string | null;
};

export async function getMyWallet(): Promise<GuestWallet> {
  const { data } = await sharedApi.get<GuestWallet>('/users/me/wallet');
  return data;
}

export async function previewTopUp(
  amount: number,
  opts?: { paymentType?: 'TOP_UP_CARD' | 'TOP_UP_MOBILE'; cardId?: string },
) {
  const { data } = await sharedApi.post<TopUpPreview>('/users/me/wallet/top-up/preview', {
    amount,
    paymentType: opts?.paymentType ?? 'TOP_UP_CARD',
    paymentCardId: opts?.cardId,
  });
  return data;
}

export async function confirmTopUp(
  amount: number,
  opts?: { paymentType?: 'TOP_UP_CARD' | 'TOP_UP_MOBILE'; cardId?: string },
) {
  const { data } = await sharedApi.post<{ message?: string; success?: boolean }>(
    '/users/me/wallet/top-up',
    {
      amount,
      paymentType: opts?.paymentType ?? 'TOP_UP_CARD',
      paymentCardId: opts?.cardId,
    },
  );
  return data;
}

export async function markAllNotificationsRead() {
  await sharedApi.patch('/users/me/wallet/notifications/read-all');
}

export async function deleteNotification(id: string) {
  await sharedApi.delete(`/users/me/wallet/notifications/${id}`);
}

export async function markLoyaltyWelcomeShown() {
  await sharedApi.post('/users/me/wallet/welcome-shown');
}

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export async function getNotifications(): Promise<UserNotification[]> {
  const { data } = await sharedApi.get<UserNotification[]>('/users/me/wallet/notifications');
  return data;
}

export async function markNotificationRead(id: string) {
  await sharedApi.patch(`/users/me/wallet/notifications/${id}/read`);
}
