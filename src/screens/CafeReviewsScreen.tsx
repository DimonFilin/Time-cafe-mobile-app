import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { getReviews } from '@/api/reviews';
import { StarRating } from '@/components/StarRating';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/utils/dates';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<CafesStackParamList, 'CafeReviews'>;

const MIN_RATING_OPTIONS = [0, 3, 4, 4.5, 5];

export function CafeReviewsScreen({ navigation, route }: Props) {
  const { cafeId, cafeName } = route.params;
  const viewerId = useAuthStore((state) => state.user?.id);
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
  const myReview = useMemo(
    () => items.find((item) => item.userId === viewerId),
    [items, viewerId],
  );

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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{v === 0 ? t('common.any') : `${v}+`}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('cafes.reviews.verifiedOnly')}</Text>
          <Switch value={verifiedOnly} onValueChange={setVerifiedOnly} />
        </View>

        {!myReview ? (
          <Pressable
            onPress={() => navigation.navigate('ReviewCreate', { cafeId, cafeName })}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>{t('cafes.reviews.write')}</Text>
          </Pressable>
        ) : null}
      </View>

      {reviewsQuery.isLoading ? <Text style={styles.topText}>{t('common.loading')}</Text> : null}

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
              <Text style={styles.userName}>{item.userName || t('common.user')}</Text>
              <View style={styles.rowRight}>
                {item.userId === viewerId ? (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('ReviewCreate', {
                        cafeId,
                        cafeName,
                        reviewId: item.id,
                        initialRating: item.rating,
                        initialComment: item.comment,
                      })
                    }
                    hitSlop={8}
                    style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.editBtnIcon}>✏️</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.date}>{formatDateTime(item.createdAt, 'PP')}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <StarRating value={item.rating} />
              {item.isVerified ? <Text style={styles.verified}>{t('common.verified')}</Text> : null}
            </View>

            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topText: { padding: Spacing.md, color: Colors.textMuted, fontSize: Typography.sm },
  filtersCard: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },
  label: { ...Styles.label },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.beige,
  },
  chipActive: { borderColor: Colors.coffeeDark, backgroundColor: Colors.coffeeDark },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.textInverse, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  primaryBtn: { ...Styles.primaryBtn },
  primaryBtnText: { ...Styles.primaryBtnText },
  pressed: Styles.pressed,
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  userName: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: Typography.sm, color: Colors.textMuted },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige,
  },
  editBtnIcon: { fontSize: 14 },
  verified: { fontSize: Typography.xs, fontWeight: '700', color: Colors.success },
  comment: { fontSize: Typography.base, marginTop: Spacing.xs, lineHeight: 20, color: Colors.textSecondary },
});

