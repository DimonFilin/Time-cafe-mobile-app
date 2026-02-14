import { sharedApi } from '@/config/api';

export type CafeListItem = {
  id: string;
  name: string;
  address: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  brandId?: string;
  brandName?: string;
  photos?: string[];
};

export type CafeListResponse = {
  items: CafeListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CafeDetails = {
  id: string;
  name: string;
  address: string;
  city?: string;
  street?: string;
  description?: string;
  rating?: number;
  reviewsCount?: number;
  cafeApiUrl?: string;
  photos?: string[];
  latitude?: number;
  longitude?: number;
  brandId?: string;
  brandName?: string;
  regionId?: string;
  regionName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CafesSortBy = 'rating' | 'distance' | 'createdAt' | 'reviewsCount';
export type CafesSortOrder = 'asc' | 'desc';

export async function getCafes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  country?: string;
  sortBy?: CafesSortBy;
  sortOrder?: CafesSortOrder;
}): Promise<CafeListResponse> {
  const res = await sharedApi.get('/cafes', { params });
  return res.data as CafeListResponse;
}

export async function getCafeById(id: string): Promise<CafeDetails> {
  const res = await sharedApi.get(`/cafes/${id}`);
  return res.data as CafeDetails;
}

export async function getCafePhotoUrls(id: string): Promise<{ urls: string[] }> {
  const res = await sharedApi.get(`/cafes/${id}/photo-urls`);
  return res.data as { urls: string[] };
}

