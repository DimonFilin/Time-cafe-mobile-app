import { sharedApi } from '@/config/api';
import { resolveFileUrl } from '@/utils/files';

import {
  getMockBrandBannerUrl,
  getMockBrandById,
  getMockBrandLogoUrl,
  isMockBrandId,
} from '@/api/mock-cafes';

export type BrandDetails = {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
  bannerImage?: string;
  backgroundImage?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
};

export type BrandPresentation = BrandDetails & {
  logoUrl?: string;
  bannerUrl?: string;
};

export async function getBrandById(id: string): Promise<BrandDetails> {
  const mock = getMockBrandById(id);
  if (mock) {
    return mock;
  }
  const res = await sharedApi.get(`/brands/${id}`);
  return res.data as BrandDetails;
}

export async function getBrandLogoSignedUrl(id: string): Promise<{ url: string }> {
  const mockUrl = getMockBrandLogoUrl(id);
  if (mockUrl) {
    return { url: mockUrl };
  }
  const res = await sharedApi.get(`/brands/${id}/logo-url`);
  return res.data as { url: string };
}

export async function getBrandBannerSignedUrl(id: string): Promise<{ url: string }> {
  const mockUrl = getMockBrandBannerUrl(id);
  if (mockUrl) {
    return { url: mockUrl };
  }
  const res = await sharedApi.get(`/brands/${id}/banner-url`);
  return res.data as { url: string };
}

export async function getBrandPresentationById(id?: string | null): Promise<BrandPresentation | undefined> {
  if (!id) {
    return undefined;
  }

  const brand = await getBrandById(id);

  if (isMockBrandId(id)) {
    return {
      ...brand,
      logoUrl: resolveFileUrl(brand.logo) ?? brand.logo,
      bannerUrl: resolveFileUrl(brand.bannerImage) ?? brand.bannerImage,
    };
  }

  const [logoUrl, bannerUrl] = await Promise.all([
    getBrandLogoSignedUrl(id)
      .then((res) => res.url)
      .catch(() => brand.logo),
    getBrandBannerSignedUrl(id)
      .then((res) => res.url)
      .catch(() => brand.bannerImage),
  ]);

  return {
    ...brand,
    logoUrl: resolveFileUrl(logoUrl) ?? logoUrl,
    bannerUrl: resolveFileUrl(bannerUrl) ?? bannerUrl,
  };
}

