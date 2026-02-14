import { sharedApi } from '@/config/api';

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

export async function getBrandById(id: string): Promise<BrandDetails> {
  const res = await sharedApi.get(`/brands/${id}`);
  return res.data as BrandDetails;
}

export async function getBrandLogoSignedUrl(id: string): Promise<{ url: string }> {
  const res = await sharedApi.get(`/brands/${id}/logo-url`);
  return res.data as { url: string };
}

export async function getBrandBannerSignedUrl(id: string): Promise<{ url: string }> {
  const res = await sharedApi.get(`/brands/${id}/banner-url`);
  return res.data as { url: string };
}

