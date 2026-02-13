import { sharedApi } from '@/config/api';

export type Card = {
  id: string;
  last4Digits: string;
  cardType: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  isActive: boolean;
  holderName?: string;
  createdAt: string;
};

export type AddCardInput = {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  holderName?: string;
};

export async function getCards(): Promise<Card[]> {
  const res = await sharedApi.get('/users/cards');
  return res.data as Card[];
}

export async function addCard(input: AddCardInput): Promise<Card> {
  const res = await sharedApi.post('/users/cards', input);
  return res.data as Card;
}

export async function deleteCard(id: string): Promise<void> {
  await sharedApi.delete(`/users/cards/${id}`);
}

export async function setDefaultCard(id: string): Promise<Card> {
  const res = await sharedApi.patch(`/users/cards/${id}/set-default`);
  return res.data as Card;
}

