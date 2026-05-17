/**
 * Centralized design tokens for the mobile app.
 * Coffee-inspired palette matching the admin-web aesthetic.
 */

export const Colors = {
  // ── Core palette ──────────────────────────────────────────────
  /** Pure white – main background */
  white: '#FFFFFF',
  /** Very light warm cream – secondary surfaces, cards */
  cream: '#FAF7F4',
  /** Light warm beige – input backgrounds, subtle fills */
  beige: '#F2EDE8',
  /** Soft warm border / divider */
  border: '#E8DDD5',
  /** Muted warm border – lighter dividers */
  borderLight: '#F0E8E0',

  // ── Coffee tones ──────────────────────────────────────────────
  /** Light coffee – chips, tags, secondary accents */
  coffeLight: '#C8A882',
  /** Medium coffee – primary accent, active states */
  coffee: '#A0714F',
  /** Dark coffee – primary buttons, strong accents */
  coffeeDark: '#6B4226',
  /** Espresso – deepest brown, used sparingly */
  espresso: '#3D2314',

  // ── Text ──────────────────────────────────────────────────────
  /** Primary text – almost black */
  textPrimary: '#1A1008',
  /** Secondary text – medium brown-gray */
  textSecondary: '#6B5B4E',
  /** Muted text – labels, placeholders */
  textMuted: '#9C8878',
  /** Inverse text – on dark backgrounds */
  textInverse: '#FFFFFF',

  // ── Semantic ──────────────────────────────────────────────────
  success: '#2D7A4F',
  successBg: '#EAF5EE',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  error: '#B91C1C',
  errorBg: '#FEE2E2',
  info: '#1D4ED8',
  infoBg: '#EFF6FF',
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Typography = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

/** Reusable style fragments */
export const Styles = {
  /** Standard card surface */
  card: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  /** Primary filled button */
  primaryBtn: {
    minHeight: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.coffeeDark,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sm,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  /** Secondary outlined button */
  secondaryBtn: {
    minHeight: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.coffeeDark,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.coffeeDark,
    fontSize: Typography.sm,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  /** Standard text input */
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.beige,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  /** Small label above inputs */
  label: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    fontWeight: '500' as const,
  },
  /** Header icon button */
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.beige,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
} as const;
