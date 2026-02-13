import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getCafes, type CafesSortBy, type CafesSortOrder } from '@/api/cafes';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';

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

export function CafesScreen({ navigation }: Props) {
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
            <Ionicons name="search-outline" size={18} color="#111" />
          </Pressable>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="filter-outline" size={18} color="#111" />
          </Pressable>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="swap-vertical-outline" size={18} color="#111" />
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
        ListEmptyComponent={!cafesQuery.isLoading ? <Text style={styles.topText}>{t('cafes.empty')}</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('CafeDetails', { id: item.id, title: item.name })}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSub}>
              {item.address}
              {item.city ? ` • ${item.city}` : ''}
            </Text>
            {typeof item.rating === 'number' ? <Text style={styles.itemMeta}>rating: {item.rating}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topText: { padding: 12 },
  headerActions: { flexDirection: 'row', gap: 6, paddingRight: 8 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemPressed: { opacity: 0.8 },
  itemTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemSub: { fontSize: 12, opacity: 0.7 },
  itemMeta: { fontSize: 12, opacity: 0.6, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { borderColor: '#111', backgroundColor: '#111' },
  chipText: { fontSize: 12, color: '#111' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#111' },
  primaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pressed: { opacity: 0.85 },
});

