import { sharedApi } from '@/config/api';
import { getBrandPresentationById, type BrandPresentation } from '@/api/brands';
import { getStableColorFromId } from '@/utils/colors';
import { resolveFileUrl } from '@/utils/files';

type RawCafeListItem = {
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

type RawCafeDetails = {
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
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  phone?: string;
  email?: string;
  occupancyMode?: 'PERCENT' | 'COUNT';
  totalCapacity?: number;
  isOpenNow?: boolean | null;
};

export type CafeTheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  fontFamily?: string;
};

export type CafePresentationAssets = {
  logoUrl?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  photoUrls: string[];
};

export type CafePresentation = {
  theme: CafeTheme;
  assets: CafePresentationAssets;
  subtitle: string;
  brandLabel?: string;
};

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
  brand?: BrandPresentation;
  presentation: CafePresentation;
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
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  phone?: string;
  email?: string;
  occupancyMode?: 'PERCENT' | 'COUNT';
  totalCapacity?: number;
  isOpenNow?: boolean | null;
  brand?: BrandPresentation;
  presentation: CafePresentation;
};

export type CafesSortBy = 'rating' | 'distance' | 'createdAt' | 'reviewsCount';
export type CafesSortOrder = 'asc' | 'desc';

function normalizeImageUrl(input?: string | null): string | undefined {
  const resolved = resolveFileUrl(input);
  return resolved || undefined;
}

function buildTheme(cafeId: string, brand?: BrandPresentation): CafeTheme {
  const fallback = getStableColorFromId(String(brand?.id || cafeId));
  return {
    primary: brand?.primaryColor || brand?.accentColor || fallback,
    secondary: brand?.secondaryColor || brand?.primaryColor || fallback,
    accent: brand?.accentColor || brand?.primaryColor || fallback,
    background: brand?.backgroundColor || '#FFFFFF',
    text: brand?.textColor || '#111111',
    fontFamily: brand?.fontFamily,
  };
}

function buildSubtitle(cafe: Pick<RawCafeDetails, 'address' | 'city' | 'regionName'>): string {
  return [cafe.address, cafe.city, cafe.regionName].filter(Boolean).join(' • ');
}

function buildPresentation(
  cafe: RawCafeDetails,
  brand: BrandPresentation | undefined,
  photoUrls: string[],
): CafePresentation {
  const theme = buildTheme(cafe.id, brand);
  const normalizedPhotos = photoUrls.map((url) => normalizeImageUrl(url)).filter(Boolean) as string[];
  const logoUrl = normalizeImageUrl(brand?.logoUrl || brand?.logo);
  const bannerUrl = normalizeImageUrl(brand?.bannerUrl || brand?.bannerImage);
  const thumbnailUrl = logoUrl || normalizedPhotos[0];

  return {
    theme,
    assets: {
      logoUrl,
      bannerUrl,
      thumbnailUrl,
      photoUrls: normalizedPhotos,
    },
    subtitle: buildSubtitle(cafe),
    brandLabel: brand?.name || cafe.brandName,
  };
}

function matchesText(value: string | undefined, query: string | undefined): boolean {
  if (!query) {
    return true;
  }

  return String(value || '')
    .toLowerCase()
    .includes(query.toLowerCase());
}

function sortCafeItems(
  items: RawCafeListItem[],
  sortBy: CafesSortBy = 'rating',
  sortOrder: CafesSortOrder = 'desc',
): RawCafeListItem[] {
  if (sortBy === 'distance') {
    return items;
  }

  const factor = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortBy === 'reviewsCount') {
      return ((left.reviewsCount || 0) - (right.reviewsCount || 0)) * factor;
    }

    if (sortBy === 'createdAt') {
      const leftDate = Date.parse(String((left as RawCafeDetails).createdAt || 0));
      const rightDate = Date.parse(String((right as RawCafeDetails).createdAt || 0));
      return (leftDate - rightDate) * factor;
    }

    return ((left.rating || 0) - (right.rating || 0)) * factor;
  });

  return sorted;
}

async function loadBrandPresentation(brandId?: string): Promise<BrandPresentation | undefined> {
  if (!brandId) {
    return undefined;
  }

  try {
    return await getBrandPresentationById(brandId);
  } catch {
    return undefined;
  }
}

async function loadCafePhotos(cafe: RawCafeDetails): Promise<string[]> {
  try {
    const result = await getCafePhotoUrls(cafe.id);
    if (result.urls.length > 0) {
      return result.urls;
    }
  } catch {
    // Fall back to raw DTO photo list when signed URLs are unavailable.
  }

  return cafe.photos || [];
}

async function enrichCafe(cafe: RawCafeDetails): Promise<CafeDetails> {
  const [brand, photoUrls] = await Promise.all([
    loadBrandPresentation(cafe.brandId),
    loadCafePhotos(cafe),
  ]);

  return {
    ...cafe,
    brand,
    presentation: buildPresentation(cafe, brand, photoUrls),
  };
}

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
  const response = res.data as { items: RawCafeListItem[]; total: number; page: number; limit: number; totalPages: number };
  const sortedItems = sortCafeItems(response.items, params?.sortBy, params?.sortOrder);

  const items = await Promise.all(
    sortedItems.map(async (item) => {
      const detailsLike: RawCafeDetails = item;
      const [brand, photoUrls] = await Promise.all([
        loadBrandPresentation(item.brandId),
        Promise.resolve(item.photos || []),
      ]);

      return {
        ...item,
        brand,
        presentation: buildPresentation(detailsLike, brand, photoUrls),
      };
    }),
  );

  return {
    items,
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
}

export async function getCafeById(id: string): Promise<CafeDetails> {
  const res = await sharedApi.get(`/cafes/${id}`);
  return enrichCafe(res.data as RawCafeDetails);
}

export async function getCafePhotoUrls(id: string): Promise<{ urls: string[] }> {
  const res = await sharedApi.get(`/cafes/${id}/photo-urls`);
  return res.data as { urls: string[] };
}

