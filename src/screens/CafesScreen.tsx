import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getCafes, type CafesSortBy, type CafesSortOrder } from '@/api/cafes';
import { StarRating } from '@/components/StarRating';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<CafesStackParamList, 'CafesList'>;

type CafesQueryParams = {
  search?: string;
  city?: string;
  country?: string;
  sortBy?: CafesSortBy;
  sortOrder?: CafesSortOrder;
};

const SORT_BY_OPTIONS: CafesSortBy[] = ['rating', 'distance', 'createdAt', 'reviewsCount'];
const SORT_ORDER_OPTIONS: CafesSortOrder[] = ['desc', 'asc'];

function getInitial(name?: string | null) {
  const raw = String(name || '').trim();
  return (raw[0] || 'C').toUpperCase();
}

function CafeThumb(props: {
  uri?: string | null;
  title?: string | null;
  color: string;
}) {
  const { uri, title, color } = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = !!uri && !failed;

  return (
    <View style={[styles.thumb, { backgroundColor: color }, styles.thumbLetterWrap]}>
      <Text style={styles.thumbLetter}>{getInitial(title)}</Text>
      {showImage ? (
        <Image
          source={{ uri }}
          style={styles.thumbImg}
          onError={() => {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log('[CafeThumb] image failed', { uri });
            }
            setFailed(true);
          }}
        />
      ) : null}
    </View>
  );
}

export function CafesScreen({ navigation }: Props) {
  const listBottomPadding = useTabScreenBottomPadding();
  const [modalVisible, setModalVisible] = useState(false);

  const [draft, setDraft] = useState<CafesQueryParams>({
    search: '',
    city: '',
    country: '',
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const [applied, setApplied] = useState<CafesQueryParams>({
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 20,
      search: applied.search?.trim() || undefined,
      city: applied.city?.trim() || undefined,
      country: applied.country?.trim() || undefined,
      sortBy: applied.sortBy,
      sortOrder: applied.sortOrder,
    }),
    [applied]
  );

  const cafesQuery = useQuery({
    queryKey: ['cafes', queryParams],
    queryFn: () => getCafes(queryParams),
    retry: false,
  });

  useLayoutEffect(() => {
    const open = () => setModalVisible(true);

    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="search-outline" size={18} color={Colors.coffeeDark} />
          </Pressable>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="filter-outline" size={18} color={Colors.coffeeDark} />
          </Pressable>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="swap-vertical-outline" size={18} color={Colors.coffeeDark} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const apply = () => {
    setApplied({
      search: draft.search?.trim() || undefined,
      city: draft.city?.trim() || undefined,
      country: draft.country?.trim() || undefined,
      sortBy: draft.sortBy,
      sortOrder: draft.sortOrder,
    });
    setModalVisible(false);
  };

  const reset = () => {
    const next: CafesQueryParams = {
      search: '',
      city: '',
      country: '',
      sortBy: 'rating',
      sortOrder: 'desc',
    };
    setDraft(next);
    setApplied({ sortBy: next.sortBy, sortOrder: next.sortOrder });
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {cafesQuery.isLoading ? <Text style={styles.topText}>{t('cafes.loading')}</Text> : null}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('cafes.searchTitle')}</Text>

            <Text style={styles.label}>{t('cafes.searchTitle')}</Text>
            <TextInput
              value={draft.search ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, search: v }))}
              placeholder={t('cafes.searchPlaceholder')}
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.sectionTitle}>{t('cafes.filtersTitle')}</Text>
            <Text style={styles.label}>{t('cafes.city')}</Text>
            <TextInput
              value={draft.city ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, city: v }))}
              autoCapitalize="words"
              style={styles.input}
            />

            <Text style={styles.label}>{t('cafes.country')}</Text>
            <TextInput
              value={draft.country ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, country: v }))}
              autoCapitalize="words"
              style={styles.input}
            />

            <Text style={styles.sectionTitle}>{t('cafes.sortTitle')}</Text>
            <Text style={styles.label}>{t('cafes.sortBy')}</Text>
            <View style={styles.chipsRow}>
              {SORT_BY_OPTIONS.map((opt) => {
                const active = draft.sortBy === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDraft((s) => ({ ...s, sortBy: opt }))}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`cafes.sortBy_${opt}`)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{t('cafes.sortOrder')}</Text>
            <View style={styles.chipsRow}>
              {SORT_ORDER_OPTIONS.map((opt) => {
                const active = draft.sortOrder === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDraft((s) => ({ ...s, sortOrder: opt }))}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(`cafes.sortOrder_${opt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable onPress={reset} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>{t('cafes.reset')}</Text>
              </Pressable>
              <Pressable onPress={apply} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
                <Text style={styles.primaryBtnText}>{t('cafes.apply')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={cafesQuery.data?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshing={cafesQuery.isFetching}
        onRefresh={() => cafesQuery.refetch()}
        contentContainerStyle={{ paddingBottom: listBottomPadding }}
        ListEmptyComponent={!cafesQuery.isLoading ? <Text style={styles.topText}>{t('cafes.empty')}</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('CafeDetails', { id: item.id, title: item.name })}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: item.presentation.theme.background },
              pressed && styles.itemPressed,
            ]}
          >
            {(() => {
              const stripeColor = item.presentation.theme.primary;
              return (
                <>
                  <View style={[styles.stripe, { backgroundColor: stripeColor }]} />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTopRow}>
                      <CafeThumb
                        uri={item.presentation.assets.thumbnailUrl}
                        title={item.name}
                        color={stripeColor}
                      />

                      <View style={styles.itemMain}>
                        <Text
                          style={[
                            styles.itemTitle,
                            { color: item.presentation.theme.text },
                            item.presentation.theme.fontFamily
                              ? { fontFamily: item.presentation.theme.fontFamily }
                              : null,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={[styles.itemSub, { color: item.presentation.theme.text }]} numberOfLines={2}>
                          {item.presentation.subtitle}
                        </Text>
                        {item.presentation.brandLabel ? (
                          <Text
                            style={[styles.itemBrand, { color: item.presentation.theme.accent }]}
                            numberOfLines={1}
                          >
                            {item.presentation.brandLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.itemBottomRow}>
                      <View style={styles.ratingRow}>
                        <StarRating value={Number(item.rating ?? 0)} />
                        <Text style={styles.itemMeta}>
                          {typeof item.rating === 'number' ? item.rating.toFixed(1) : '—'}
                          {typeof item.reviewsCount === 'number' ? ` (${item.reviewsCount})` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              );
            })()}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topText: { padding: Spacing.md, color: Colors.textMuted, fontSize: Typography.sm },
  headerActions: { flexDirection: 'row', gap: 6, paddingRight: Spacing.sm },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige,
  },
  item: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  itemPressed: { opacity: 0.8 },
  stripe: { width: 4, borderRadius: Radius.full },
  itemBody: { flex: 1, gap: Spacing.sm },
  itemTopRow: { flexDirection: 'row', gap: Spacing.sm },
  itemMain: { flex: 1 },
  thumb: { width: 54, height: 54, borderRadius: Radius.md, backgroundColor: Colors.beige },
  thumbImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  thumbFallback: { backgroundColor: Colors.beige },
  thumbLetterWrap: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  itemTitle: { fontSize: Typography.base, fontWeight: '700', marginBottom: 2 },
  itemSub: { fontSize: Typography.sm, opacity: 0.7 },
  itemBrand: { fontSize: Typography.sm, fontWeight: '700', marginTop: 6 },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemMeta: { fontSize: Typography.sm, color: Colors.textMuted },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  label: { ...Styles.label, marginBottom: Spacing.xs },
  input: { ...Styles.input, marginBottom: Spacing.sm },
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
  modalButtonsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  secondaryBtn: { ...Styles.secondaryBtn, flex: 1 },
  secondaryBtnText: Styles.secondaryBtnText,
  primaryBtn: { ...Styles.primaryBtn, flex: 1 },
  primaryBtnText: Styles.primaryBtnText,
  pressed: Styles.pressed,
});

