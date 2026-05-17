import { sharedApi } from '@/config/api';

export type Review = {
  id: string;
  userId: string;
  userName: string;
  cafeId: string;
  orderId?: string;
  rating: number;
  comment?: string;
  pros?: string[];
  cons?: string[];
  photos?: string[];
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewListResponse = {
  items: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getReviews(params?: {
  cafeId?: string;
  page?: number;
  limit?: number;
  minRating?: number;
  verifiedOnly?: boolean;
}): Promise<ReviewListResponse> {
  const res = await sharedApi.get('/reviews', { params });
  return res.data as ReviewListResponse;
}

export type CreateReviewInput = {
  cafeId: string;
  rating: number;
  comment?: string;
  pros?: string[];
  cons?: string[];
  photos?: string[];
  orderId?: string;
};

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const res = await sharedApi.post('/reviews', input);
  return res.data as Review;
}

export type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

export async function updateReview(id: string, input: UpdateReviewInput): Promise<Review> {
  const res = await sharedApi.patch(`/reviews/${id}`, input);
  return res.data as Review;
}

export async function getMyReviewForCafe(cafeId: string, userId: string): Promise<Review | null> {
  try {
    const res = await sharedApi.get('/reviews', { params: { cafeId, limit: 50 } });
    const data = res.data as { items: Review[] };
    return data.items.find((r) => r.userId === userId) ?? null;
  } catch {
    return null;
  }
}

