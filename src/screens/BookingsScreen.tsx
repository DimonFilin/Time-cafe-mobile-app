import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppointmentStatus } from '@/api/appointments';
import { getMyAppointments } from '@/api/appointments';
import { useTabScreenBottomPadding } from '@/hooks/useTabScreenBottomPadding';
import { t } from '@/i18n';
import type { BookingsStackParamList } from '@/navigation/stacks';
import { formatDateTime } from '@/utils/dates';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<BookingsStackParamList, 'BookingsList'>;

type Filters = { statuses?: AppointmentStatus[]; from?: string; to?: string };

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];
const STATUS_PRIORITY: Record<AppointmentStatus, number> = {
  confirmed: 0, pending: 1, completed: 2, cancelled: 3,
};

function getStatusStyle(status: AppointmentStatus) {
  switch (status) {
    case 'confirmed': return { bg: Colors.successBg, text: Colors.success };
    case 'pending':   return { bg: Colors.warningBg, text: Colors.warning };
    case 'completed': return { bg: Colors.infoBg,    text: Colors.info };
    case 'cancelled': return { bg: Colors.errorBg,   text: Colors.error };
  }
}

const STATUS_ICONS: Record<AppointmentStatus, string> = {
  confirmed: '✓', pending: '⏳', completed: '✔', cancelled: '✕',
};

export function BookingsScreen({ navigation }: Props) {
  const listBottomPadding = useTabScreenBottomPadding();
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<Filters>({ statuses: [], from: '', to: '' });
  const [applied, setApplied] = useState<Filters>({ statuses: [] });

  const queryParams = useMemo(() => ({
    page: 1, limit: 20,
    status: applied.statuses?.length === 1 ? applied.statuses[0] : undefined,
    from: applied.from?.trim() || undefined,
    to: applied.to?.trim() || undefined,
  }), [applied]);

  const bookingsQuery = useQuery({
    queryKey: ['appointments', queryParams],
    queryFn: () => getMyAppointments(queryParams),
    retry: false,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [Styles.headerIcon, pressed && Styles.pressed]}
          >
            <Ionicons name="filter-outline" size={18} color={Colors.coffeeDark} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const apply = () => {
    setApplied({ statuses: draft.statuses ?? [], from: draft.from?.trim() || undefined, to: draft.to?.trim() || undefined });
    setModalVisible(false);
  };
  const reset = () => {
    setDraft({ statuses: [], from: '', to: '' });
    setApplied({ statuses: [] });
    setModalVisible(false);
  };

  const items = useMemo(() => {
    const raw = bookingsQuery.data?.items ?? [];
    const statuses = applied.statuses ?? [];
    const filtered = statuses.length ? raw.filter((x) => statuses.includes(x.status)) : raw;
    return [...filtered].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status], pb = STATUS_PRIORITY[b.status];
      if (pa !== pb) return pa - pb;
      const ta = Date.parse(a.dateTime), tb = Date.parse(b.dateTime);
      const active = a.status === 'confirmed' || a.status === 'pending';
      return Number.isFinite(ta) && Number.isFinite(tb) ? (active ? ta - tb : tb - ta) : 0;
    });
  }, [bookingsQuery.data?.items, applied.statuses]);

  const hasActiveFilters = (applied.statuses?.length ?? 0) > 0 || !!applied.from || !!applied.to;

  return (
    <View style={styles.container}>
      {hasActiveFilters && (
        <View style={styles.activeFilterBanner}>
          <Text style={styles.activeFilterText}>
            {t('appointments.filtersActive') ?? 'Фильтры активны'}
          </Text>
          <Pressable onPress={reset}>
            <Text style={styles.activeFilterClear}>{t('appointments.reset')}</Text>
          </Pressable>
        </View>
      )}

      {bookingsQuery.isLoading ? (
        <View style={styles.centerMsg}>
          <Text style={styles.centerMsgText}>{t('appointments.loading')}</Text>
        </View>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('appointments.filtersTitle')}</Text>

            <Text style={Styles.label}>{t('appointments.status')}</Text>
            <View style={styles.chipsRow}>
              <Pressable
                onPress={() => setDraft((s) => ({ ...s, statuses: [] }))}
                style={({ pressed }) => [
                  styles.chip,
                  (!draft.statuses?.length) && styles.chipActive,
                  pressed && Styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, (!draft.statuses?.length) && styles.chipTextActive]}>
                  {t('appointments.allStatuses')}
                </Text>
              </Pressable>
              {STATUS_OPTIONS.map((opt) => {
                const selected = (draft.statuses ?? []).includes(opt);
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDraft((s) => {
                      const cur = s.statuses ?? [];
                      return { ...s, statuses: selected ? cur.filter((x) => x !== opt) : [...cur, opt] };
                    })}
                    style={({ pressed }) => [styles.chip, selected && styles.chipActive, pressed && Styles.pressed]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {t(`appointments.status_${opt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={Styles.label}>{t('appointments.from')}</Text>
            <TextInput
              value={draft.from ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, from: v }))}
              autoCapitalize="none"
              placeholder="2025-01-01T00:00:00.000Z"
              style={[Styles.input, styles.filterInput]}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={[Styles.label, { marginTop: Spacing.sm }]}>{t('appointments.to')}</Text>
            <TextInput
              value={draft.to ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, to: v }))}
              autoCapitalize="none"
              placeholder="2025-01-31T23:59:59.999Z"
              style={[Styles.input, styles.filterInput]}
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable onPress={reset} style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}>
                <Text style={Styles.secondaryBtnText}>{t('appointments.reset')}</Text>
              </Pressable>
              <Pressable onPress={apply} style={({ pressed }) => [Styles.primaryBtn, styles.modalBtn, pressed && Styles.pressed]}>
                <Text style={Styles.primaryBtnText}>{t('appointments.apply')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={bookingsQuery.isFetching}
        onRefresh={() => bookingsQuery.refetch()}
        contentContainerStyle={
          items.length === 0
            ? styles.emptyContainer
            : [styles.listContent, { paddingBottom: listBottomPadding }]
        }
        ListEmptyComponent={
          !bookingsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>{t('appointments.empty')}</Text>
              <Text style={styles.emptySubtitle}>{t('appointments.emptyHint')}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const s = getStatusStyle(item.status);
          return (
            <Pressable
              onPress={() => navigation.navigate('BookingDetails', { id: item.id, title: item.cafeName ?? item.id })}
              style={({ pressed }) => [styles.item, pressed && Styles.pressed]}
            >
              <View style={[styles.itemAccent, { backgroundColor: s.text }]} />
              <View style={styles.itemBody}>
                <View style={styles.itemTopRow}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.cafeName ?? 'Cafe'}</Text>
                  <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.text }]}>
                      {STATUS_ICONS[item.status]} {t(`appointments.status_${item.status}`)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemSub}>
                  {formatDateTime(item.dateTime)} · {item.duration} мин
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  headerActions: { flexDirection: 'row', gap: 6, paddingRight: Spacing.sm },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.coffeeDark,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  activeFilterText: { color: Colors.textInverse, fontSize: Typography.sm },
  activeFilterClear: { color: Colors.coffeLight, fontSize: Typography.sm, fontWeight: '700' },
  centerMsg: { padding: Spacing.lg, alignItems: 'center' },
  centerMsgText: { color: Colors.textMuted, fontSize: Typography.base },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: Typography.base, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemAccent: { width: 4, alignSelf: 'stretch' },
  itemBody: { flex: 1, padding: Spacing.md },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  itemTitle: { flex: 1, fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: { fontSize: Typography.xs, fontWeight: '700' },
  itemSub: { fontSize: Typography.sm, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
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
  filterInput: { marginBottom: 0 },
  modalButtonsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1 },
});
