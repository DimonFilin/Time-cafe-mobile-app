import { sharedApi } from '@/config/api';
import { getMockCafeMenu } from '@/api/mock-cafes';

export interface MenuItem {
  id: string;
  key: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: string;
  currency: string;
  photoUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuCategory {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface CafeMenuResponse {
  cafeId: string;
  categories: MenuCategory[];
}

export async function getCafeMenu(cafeId: string): Promise<CafeMenuResponse> {
  const mockMenu = getMockCafeMenu(cafeId);
  if (mockMenu) {
    return mockMenu;
  }
  const res = await sharedApi.get<CafeMenuResponse>(`/cafes/${cafeId}/menu`);
  return res.data;
}


