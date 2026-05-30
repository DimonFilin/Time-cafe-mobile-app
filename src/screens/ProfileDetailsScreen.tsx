import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { me } from '@/api/auth';
import { getMyWallet } from '@/api/wallet';
import { HelpHint } from '@/components/HelpHint';
import { HINT_ANTICAFE_DEPOSIT } from '@/constants/wallet-hints';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function LabelWithHint({ label, hint }: { label: string; hint: { title: string; body: string } }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.section}>{label}</Text>
      <HelpHint title={hint.title} body={hint.body} iconSize={18} />
    </View>
  );
}

export function ProfileDetailsScreen() {
  const sessionUser = useAuthStore((s) => s.user);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: me, initialData: sessionUser ?? undefined });
  const walletQuery = useQuery({ queryKey: ['myWallet'], queryFn: getMyWallet });
  const user = meQuery.data;
  const wallet = walletQuery.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Row label={t('profile.email')} value={user?.email ?? '—'} />
        <Row
          label={t('profile.name')}
          value={`${user?.firstName ?? '—'} ${user?.lastName ?? ''}`.trim()}
        />
        <Row label={t('profile.phone')} value={(user?.phone as string) ?? '—'} />
        <Row
          label={t('profile.gender')}
          value={
            user?.gender === 'MALE'
              ? t('profile.male')
              : user?.gender === 'FEMALE'
                ? t('profile.female')
                : '—'
          }
        />
      </View>

      {wallet ? (
        <View style={styles.card}>
          <LabelWithHint label="Депозит антикафе" hint={HINT_ANTICAFE_DEPOSIT} />
          <Row label="На счёте" value={String(wallet.depositBalance)} />
          <Row label="Долг" value={String(wallet.debt)} />
          <Row
            label="Уровень"
            value={
              wallet.loyaltyTier
                ? `${wallet.loyaltyTier.name} (${wallet.loyaltyTier.bonusPercent}%)`
                : '—'
            }
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  section: { fontSize: Typography.md, fontWeight: '700', marginBottom: 4, color: Colors.coffeeDark },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: Typography.sm, color: Colors.textMuted },
  value: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
});
