export type MockBrandRecord = {
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
  logoUrl?: string;
  bannerUrl?: string;
};

export type MockCafeRecord = {
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

export type MockMenuResponse = {
  cafeId: string;
  categories: Array<{
    id: string;
    key: string;
    name: string;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
    items: Array<{
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
    }>;
  }>;
};

const starbucksBrandId = 'mock-brand-starbucks';
const kofixBrandId = 'mock-brand-kofix';

const brands: Record<string, MockBrandRecord> = {
  [starbucksBrandId]: {
    id: starbucksBrandId,
    name: 'Starbucks',
    description:
      'Global coffeehouse brand known for deep green branding, bright storefronts, and a premium cafe atmosphere.',
    website: 'https://www.starbucks.com',
    logo:
      'https://upload.wikimedia.org/wikipedia/commons/5/5e/Starbucks_coffee_wordmark.png',
    bannerImage:
      'https://images.unsplash.com/photo-1633802824147-9bf9c58c7653?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    primaryColor: '#006241',
    secondaryColor: '#1E3932',
    accentColor: '#00754A',
    backgroundColor: '#F1F8F6',
    textColor: '#1E3932',
    fontFamily: 'sans-serif',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/5e/Starbucks_coffee_wordmark.png',
    bannerUrl:
      'https://images.unsplash.com/photo-1633802824147-9bf9c58c7653?fm=jpg&q=80&w=1600&auto=format&fit=crop',
  },
  [kofixBrandId]: {
    id: kofixBrandId,
    name: 'COFIX',
    description:
      'Fixed-price coffee chain with a minimalist black-and-white identity and a fast, urban service format.',
    website: 'https://cofix.global',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Cofix_logo.png',
    bannerImage:
      'https://images.unsplash.com/photo-1565659445322-50d1fc32d3a4?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    primaryColor: '#111111',
    secondaryColor: '#2B2B2B',
    accentColor: '#111111',
    backgroundColor: '#F5F5F5',
    textColor: '#111111',
    fontFamily: 'sans-serif',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Cofix_logo.png',
    bannerUrl:
      'https://images.unsplash.com/photo-1565659445322-50d1fc32d3a4?fm=jpg&q=80&w=1600&auto=format&fit=crop',
  },
};

const cafes: Record<string, MockCafeRecord> = {
  'mock-cafe-starbucks-seattle': {
    id: 'mock-cafe-starbucks-seattle',
    name: 'Starbucks Reserve Pike Place',
    address: '1912 Pike Place, Seattle, WA 98101',
    city: 'Seattle',
    street: 'Pike Place',
    description:
      'Signature Starbucks-style cafe with a dark green palette, warm wood accents, premium coffee bar, and a spacious customer zone.',
    rating: 4.8,
    reviewsCount: 426,
    cafeApiUrl: 'https://www.starbucks.com/store-locator',
    photos: [
      'https://images.unsplash.com/photo-1633802824147-9bf9c58c7653?fm=jpg&q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1621769417345-e1ca1fdf12c3?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    ],
    latitude: 47.6094,
    longitude: -122.3417,
    brandId: starbucksBrandId,
    brandName: 'Starbucks',
    regionId: 'mock-region-us-wa',
    regionName: 'Washington',
    createdAt: '2026-01-12T09:00:00.000Z',
    updatedAt: '2026-04-14T09:00:00.000Z',
  },
  'mock-cafe-kofix-moscow': {
    id: 'mock-cafe-kofix-moscow',
    name: 'Kofix City Point',
    address: 'ул. Новый Арбат, 15, Москва',
    city: 'Москва',
    street: 'Новый Арбат',
    description:
      'Compact urban coffee spot in the Cofix spirit: monochrome branding, quick service, fixed-price menu, and a clean visual rhythm.',
    rating: 4.5,
    reviewsCount: 189,
    cafeApiUrl: 'https://cofix.global',
    photos: [
      'https://images.unsplash.com/photo-1565659445322-50d1fc32d3a4?fm=jpg&q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1672685714765-f151a2681a61?fm=jpg&q=80&w=1600&auto=format&fit=crop',
    ],
    latitude: 55.7522,
    longitude: 37.5929,
    brandId: kofixBrandId,
    brandName: 'COFIX',
    regionId: 'mock-region-ru-mow',
    regionName: 'Москва',
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-04-14T10:00:00.000Z',
  },
};

const menuByCafeId: Record<string, MockMenuResponse> = {
  'mock-cafe-starbucks-seattle': {
    cafeId: 'mock-cafe-starbucks-seattle',
    categories: [
      {
        id: 'mock-starbucks-espresso',
        key: 'espresso',
        name: 'Espresso Bar',
        description: 'Signature espresso drinks.',
        sortOrder: 0,
        isActive: true,
        items: [
          {
            id: 'mock-starbucks-latte',
            key: 'caffe-latte',
            categoryId: 'mock-starbucks-espresso',
            name: 'Caffe Latte',
            description: 'Espresso with steamed milk and light foam.',
            price: '6.50',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1517701604599-bb29b565090c?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 0,
            isActive: true,
          },
          {
            id: 'mock-starbucks-flat-white',
            key: 'flat-white',
            categoryId: 'mock-starbucks-espresso',
            name: 'Flat White',
            description: 'Ristretto shots with silky microfoam.',
            price: '6.90',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 1,
            isActive: true,
          },
        ],
      },
      {
        id: 'mock-starbucks-bakery',
        key: 'bakery',
        name: 'Bakery',
        description: 'Fresh pastries for breakfast.',
        sortOrder: 1,
        isActive: true,
        items: [
          {
            id: 'mock-starbucks-croissant',
            key: 'butter-croissant',
            categoryId: 'mock-starbucks-bakery',
            name: 'Butter Croissant',
            description: 'Flaky classic croissant.',
            price: '4.20',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1555507036-ab1f4038808a?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 0,
            isActive: true,
          },
        ],
      },
    ],
  },
  'mock-cafe-kofix-moscow': {
    cafeId: 'mock-cafe-kofix-moscow',
    categories: [
      {
        id: 'mock-kofix-coffee',
        key: 'coffee',
        name: 'Coffee',
        description: 'Fast everyday coffee.',
        sortOrder: 0,
        isActive: true,
        items: [
          {
            id: 'mock-kofix-americano',
            key: 'americano',
            categoryId: 'mock-kofix-coffee',
            name: 'Americano',
            description: 'Clean espresso with hot water.',
            price: '199.00',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1509042239860-f550ce710b93?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 0,
            isActive: true,
          },
          {
            id: 'mock-kofix-cappuccino',
            key: 'cappuccino',
            categoryId: 'mock-kofix-coffee',
            name: 'Cappuccino',
            description: 'Dense milk foam and balanced espresso.',
            price: '229.00',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1498804103079-a6351b050096?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 1,
            isActive: true,
          },
        ],
      },
      {
        id: 'mock-kofix-snacks',
        key: 'snacks',
        name: 'Quick Bites',
        description: 'Grab-and-go snacks.',
        sortOrder: 1,
        isActive: true,
        items: [
          {
            id: 'mock-kofix-cookie',
            key: 'double-chocolate-cookie',
            categoryId: 'mock-kofix-snacks',
            name: 'Double Chocolate Cookie',
            description: 'Soft cookie with dark chocolate chunks.',
            price: '159.00',
            currency: 'BYN',
            photoUrl:
              'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?fm=jpg&q=80&w=1200&auto=format&fit=crop',
            sortOrder: 0,
            isActive: true,
          },
        ],
      },
    ],
  },
};

export function getMockCafeList(): MockCafeRecord[] {
  return Object.values(cafes);
}

export function getMockCafeById(id: string): MockCafeRecord | undefined {
  return cafes[id];
}

export function getMockCafePhotoUrls(id: string): string[] | undefined {
  return cafes[id]?.photos;
}

export function getMockBrandById(id: string): MockBrandRecord | undefined {
  return brands[id];
}

export function getMockBrandLogoUrl(id: string): string | undefined {
  return brands[id]?.logoUrl;
}

export function getMockBrandBannerUrl(id: string): string | undefined {
  return brands[id]?.bannerUrl;
}

export function getMockCafeMenu(id: string): MockMenuResponse | undefined {
  return menuByCafeId[id];
}

export function isMockCafeId(id: string): boolean {
  return Boolean(cafes[id]);
}

export function isMockBrandId(id: string): boolean {
  return Boolean(brands[id]);
}
