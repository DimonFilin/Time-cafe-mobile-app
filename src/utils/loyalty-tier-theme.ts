export type LoyaltyTierKey = 'bronze' | 'silver' | 'gold';

export type LoyaltyTierTheme = {
  key: LoyaltyTierKey;
  label: string;
  screenBg: string;
  headerBg: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  accentSoft: string;
  textOnCard: string;
  textMutedOnCard: string;
  chipBg: string;
};

const THEMES: Record<LoyaltyTierKey, LoyaltyTierTheme> = {
  bronze: {
    key: 'bronze',
    label: 'Бронзовый',
    screenBg: '#FAF3EB',
    headerBg: '#F5E6D6',
    cardBg: '#FFF8F1',
    cardBorder: '#E5C4A8',
    accent: '#B87333',
    accentSoft: 'rgba(184, 115, 51, 0.18)',
    textOnCard: '#5C3D24',
    textMutedOnCard: '#8A6B52',
    chipBg: 'rgba(184, 115, 51, 0.12)',
  },
  silver: {
    key: 'silver',
    label: 'Серебряный',
    screenBg: '#F2F5F8',
    headerBg: '#E6ECF2',
    cardBg: '#F9FBFD',
    cardBorder: '#C5CED8',
    accent: '#7A8A9A',
    accentSoft: 'rgba(122, 138, 154, 0.2)',
    textOnCard: '#3D4A57',
    textMutedOnCard: '#6B7A88',
    chipBg: 'rgba(122, 138, 154, 0.14)',
  },
  gold: {
    key: 'gold',
    label: 'Золотой',
    screenBg: '#FBF6E8',
    headerBg: '#F3E8C8',
    cardBg: '#FFFBF0',
    cardBorder: '#E5D4A0',
    accent: '#B8860B',
    accentSoft: 'rgba(201, 162, 39, 0.22)',
    textOnCard: '#5C4A12',
    textMutedOnCard: '#8A7340',
    chipBg: 'rgba(201, 162, 39, 0.15)',
  },
};

export function resolveLoyaltyTierKey(tierName?: string | null): LoyaltyTierKey {
  const n = (tierName ?? '').toLowerCase();
  if (n.includes('золот') || n.includes('gold')) return 'gold';
  if (n.includes('серебр') || n.includes('silver')) return 'silver';
  return 'bronze';
}

export function getLoyaltyTierTheme(tierName?: string | null): LoyaltyTierTheme {
  return THEMES[resolveLoyaltyTierKey(tierName)];
}
