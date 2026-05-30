import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { getLoyaltyTierTheme, type LoyaltyTierTheme } from '@/utils/loyalty-tier-theme';

type Props = {
  tierName?: string | null;
  bonusPercent?: string | number | null;
};

function tierIcon(key: LoyaltyTierTheme['key']): keyof typeof Ionicons.glyphMap {
  if (key === 'gold') return 'trophy-outline';
  if (key === 'silver') return 'medal-outline';
  return 'ribbon-outline';
}

export function LoyaltyTierCard({ tierName, bonusPercent }: Props) {
  const theme = getLoyaltyTierTheme(tierName);
  const label = tierName?.trim() || theme.label;
  const bonus =
    bonusPercent != null && bonusPercent !== ''
      ? Number(bonusPercent)
      : theme.key === 'gold'
        ? 13
        : theme.key === 'silver'
          ? 8
          : 5;

  return (
    <View style={[styles.wrap, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
      <View style={[styles.glow, { backgroundColor: theme.accentSoft }]} />
      <View style={[styles.strip, { backgroundColor: theme.accent }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.chipBg }]}>
            <Ionicons name={tierIcon(theme.key)} size={22} color={theme.accent} />
          </View>
        </View>
        <Text style={[styles.tierName, { color: theme.textOnCard }]}>{label}</Text>
        <Text style={[styles.sub, { color: theme.textMutedOnCard }]}>
          Бонус при пополнении депозита — {Number.isFinite(bonus) ? bonus : '—'}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    minHeight: 128,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  strip: {
    height: 5,
    width: '100%',
    opacity: 0.55,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tierName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
});
