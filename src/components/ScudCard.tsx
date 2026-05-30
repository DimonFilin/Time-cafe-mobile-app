import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { ScudCard as ScudCardData } from '@/api/scud';
import { FullscreenQrModal } from '@/components/FullscreenQrModal';
import { getLoyaltyTierTheme } from '@/utils/loyalty-tier-theme';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = {
  card: ScudCardData | undefined;
  loading?: boolean;
};

export function ScudCard({ card, loading }: Props) {
  const [qrVisible, setQrVisible] = useState(false);
  const theme = useMemo(
    () => getLoyaltyTierTheme(card?.loyaltyTier?.name),
    [card?.loyaltyTier?.name],
  );

  if (loading) {
    return (
      <View style={[styles.wrap, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        <Text style={{ color: theme.textMutedOnCard, fontSize: 13 }}>Загрузка карты…</Text>
      </View>
    );
  }

  if (!card) return null;

  const showQr = card.canShowQr && card.qrPayload;
  const statusLabel =
    card.status === 'REFUSED'
      ? 'Доступ ограничен'
      : card.status === 'DRAFT' || !card.accessCardNumber
        ? 'Карта оформляется'
        : 'Активная карта';

  return (
    <>
      <View style={[styles.wrap, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        <View style={[styles.glow, { backgroundColor: theme.accentSoft }]} />
        <View style={[styles.strip, { backgroundColor: theme.accent }]} />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.chipBg }]}>
              <Ionicons name="card-outline" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.badge, { color: theme.accent, backgroundColor: theme.chipBg }]}>
              {statusLabel}
            </Text>
          </View>

          <Text style={[styles.name, { color: theme.textOnCard }]}>{card.displayName}</Text>
          <Text style={[styles.sub, { color: theme.textMutedOnCard }]}>{card.phone}</Text>

          {card.loyaltyTier ? (
            <Text style={[styles.tier, { color: theme.textMutedOnCard }]}>
              {card.loyaltyTier.name} · бонус {card.loyaltyTier.bonusPercent}%
            </Text>
          ) : null}

          {showQr ? (
            <Pressable
              onPress={() => setQrVisible(true)}
              style={({ pressed }) => [styles.qrBox, pressed && styles.pressed]}
            >
              <QRCode value={card.qrPayload!} size={120} />
              <Text style={[styles.qrHint, { color: theme.textMutedOnCard }]}>
                Нажмите, чтобы увеличить QR
              </Text>
            </Pressable>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="qr-code-outline" size={40} color={theme.textMutedOnCard} />
              <Text style={[styles.placeholderText, { color: theme.textMutedOnCard }]}>
                {card.status === 'REFUSED'
                  ? 'Обратитесь на ресепшен'
                  : 'QR появится после выдачи карты СКУД'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {showQr && card.qrPayload ? (
        <FullscreenQrModal
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          value={card.qrPayload}
          title="Карта СКУД"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  strip: { height: 5, width: '100%', opacity: 0.55 },
  body: { paddingHorizontal: 16, paddingVertical: 14 },
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
    borderRadius: Radius.full,
  },
  name: { fontSize: 20, fontWeight: '800' },
  sub: { fontSize: 14, marginTop: 4 },
  tier: { fontSize: 13, marginTop: 6 },
  qrBox: { alignItems: 'center', marginTop: 14, gap: 8 },
  qrHint: { fontSize: 12 },
  placeholder: { alignItems: 'center', marginTop: 16, gap: 8, paddingVertical: 12 },
  placeholderText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  pressed: { opacity: 0.85 },
});
