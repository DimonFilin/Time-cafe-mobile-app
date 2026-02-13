import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCafeById } from '@/api/cafes';
import { t } from '@/i18n';
import { navigate } from '@/navigation/navigationRef';
import type { CafesStackParamList } from '@/navigation/stacks';

type Props = StackScreenProps<CafesStackParamList, 'CafeDetails'>;

export function CafeDetailsScreen({ route }: Props) {
  const { id } = route.params;
  const [showRaw, setShowRaw] = useState(false);

  const cafeQuery = useQuery({
    queryKey: ['cafe', id],
    queryFn: () => getCafeById(id),
    retry: false,
  });

  const cafe = cafeQuery.data;

  const ratingText = useMemo(() => {
    if (typeof cafe?.rating !== 'number') return '—';
    return cafe.rating.toFixed(1);
  }, [cafe?.rating]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{cafe?.name ?? t('cafes.detailsTitle')}</Text>
      {cafeQuery.isLoading ? <Text>Loading...</Text> : null}

      {cafe ? (
        <>
          <View style={styles.card}>
            <Text style={styles.k}>{t('cafes.details.address')}</Text>
            <Text style={styles.v}>{cafe.address}</Text>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.k}>{t('cafes.details.city')}</Text>
                <Text style={styles.v}>{cafe.city || '—'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.k}>{t('cafes.details.rating')}</Text>
                <Text style={styles.v}>{ratingText}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.k}>{t('cafes.details.reviews')}</Text>
                <Text style={styles.v}>{typeof cafe.reviewsCount === 'number' ? cafe.reviewsCount : '—'}</Text>
              </View>
            </View>

            {cafe.cafeApiUrl ? (
              <>
                <Text style={[styles.k, { marginTop: 10 }]}>{t('cafes.details.apiUrl')}</Text>
                <Text style={styles.v}>{cafe.cafeApiUrl}</Text>
              </>
            ) : null}

            {cafe.description ? (
              <>
                <Text style={[styles.k, { marginTop: 10 }]}>{t('cafes.details.description')}</Text>
                <Text style={styles.v}>{cafe.description}</Text>
              </>
            ) : null}
          </View>

          <Pressable
            onPress={() => navigate('BookingCreate', { cafeId: cafe.id, cafeName: cafe.name })}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Book</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowRaw((v) => !v)}
            style={({ pressed }) => [styles.rawButton, pressed && styles.pressed]}
          >
            <Text style={styles.rawButtonText}>{t('cafes.details.raw')}</Text>
          </Pressable>

          {showRaw ? (
            <View style={styles.rawCard}>
              <Text style={styles.mono}>{JSON.stringify(cafe, null, 2)}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  col: { flex: 1 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  v: { fontSize: 13 },
  primaryBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#111',
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rawButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 12,
  },
  rawButtonText: { fontSize: 13, fontWeight: '600' },
  rawCard: { padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5', marginTop: 12 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  pressed: { opacity: 0.85 },
});

