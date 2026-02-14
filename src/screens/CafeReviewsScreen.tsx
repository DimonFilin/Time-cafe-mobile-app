import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { getReviews } from '@/api/reviews';
import { StarRating } from '@/components/StarRating';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';
import { formatDateTime } from '@/utils/dates';

type Props = StackScreenProps<CafesStackParamList, 'CafeReviews'>;

const MIN_RATING_OPTIONS = [0, 3, 4, 4.5, 5];

export function CafeReviewsScreen({ navigation, route }: Props) {
  const { cafeId, cafeName } = route.params;
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const queryParams = useMemo(
    () => ({
      cafeId,
      page: 1,
      limit: 50,
      minRating: minRating || undefined,
      verifiedOnly: verifiedOnly || undefined,
    }),
    [cafeId, minRating, verifiedOnly],
  );

  const reviewsQuery = useQuery({
    queryKey: ['reviews', queryParams],
    queryFn: () => getReviews(queryParams),
    retry: false,
  });

  const items = useMemo(() => {
    const raw = reviewsQuery.data?.items ?? [];
    return [...raw].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [reviewsQuery.data?.items]);

  return (
    <View style={styles.container}>
      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>{t('cafes.reviews.title')}</Text>

        <Text style={styles.label}>{t('cafes.reviews.minRating')}</Text>
        <View style={styles.chipsRow}>
          {MIN_RATING_OPTIONS.map((v) => {
            const active = minRating === v;
            return (
              <Pressable
                key={String(v)}
                onPress={() => setMinRating(v)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{v === 0 ? 'Any' : `${v}+`}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('cafes.reviews.verifiedOnly')}</Text>
          <Switch value={verifiedOnly} onValueChange={setVerifiedOnly} />
        </View>

        <Pressable
          onPress={() => navigation.navigate('ReviewCreate', { cafeId, cafeName })}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>{t('cafes.reviews.write')}</Text>
        </Pressable>
      </View>

      {reviewsQuery.isLoading ? <Text style={styles.topText}>Loading...</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshing={reviewsQuery.isFetching}
        onRefresh={() => reviewsQuery.refetch()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!reviewsQuery.isLoading ? <Text style={styles.topText}>{t('cafes.reviews.empty')}</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.userName}>{item.userName || 'User'}</Text>
              <Text style={styles.date}>{formatDateTime(item.createdAt, 'PP')}</Text>
            </View>

            <View style={styles.row}>
              <StarRating value={item.rating} />
              {item.isVerified ? <Text style={styles.verified}>Verified</Text> : null}
            </View>

            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topText: { padding: 12 },
  filtersCard: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filtersTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { borderColor: '#111', backgroundColor: '#111' },
  chipText: { fontSize: 12, color: '#111' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  primaryBtn: { height: 44, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pressed: { opacity: 0.85 },
  listContent: { padding: 12, paddingTop: 10, gap: 10 },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  userName: { fontSize: 13, fontWeight: '800' },
  date: { fontSize: 12, opacity: 0.7 },
  verified: { fontSize: 11, fontWeight: '800', color: '#065F46' },
  comment: { fontSize: 13, marginTop: 6, lineHeight: 18 },
});

