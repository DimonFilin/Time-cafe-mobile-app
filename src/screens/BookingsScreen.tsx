import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { AppointmentStatus } from '@/api/appointments';
import { getMyAppointments } from '@/api/appointments';
import { FullscreenQrModal } from '@/components/FullscreenQrModal';
import { t } from '@/i18n';
import type { BookingsStackParamList } from '@/navigation/stacks';
import { useAuthStore } from '@/store/authStore';
import { buildAppointmentQrPayload } from '@/utils/appointmentQr';
import { formatDateTime } from '@/utils/dates';

type Props = StackScreenProps<BookingsStackParamList, 'BookingsList'>;

type Filters = {
  statuses?: AppointmentStatus[];
  from?: string;
  to?: string;
};

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];
const STATUS_PRIORITY: Record<AppointmentStatus, number> = {
  confirmed: 0,
  pending: 1,
  completed: 2,
  cancelled: 3,
};

function getStatusColors(status: AppointmentStatus) {
  switch (status) {
    case 'confirmed':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'pending':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'completed':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'cancelled':
      return { bg: '#FEE2E2', text: '#991B1B' };
  }
}

export function BookingsScreen({ navigation }: Props) {
  const viewer = useAuthStore((s) => s.user);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [qrTitle, setQrTitle] = useState<string>('');

  const [draft, setDraft] = useState<Filters>({ statuses: [], from: '', to: '' });
  const [applied, setApplied] = useState<Filters>({ statuses: [] });

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 20,
      status: applied.statuses && applied.statuses.length === 1 ? applied.statuses[0] : undefined,
      from: applied.from?.trim() || undefined,
      to: applied.to?.trim() || undefined,
    }),
    [applied]
  );

  const bookingsQuery = useQuery({
    queryKey: ['appointments', queryParams],
    queryFn: () => getMyAppointments(queryParams),
    retry: false,
  });

  useLayoutEffect(() => {
    const open = () => setModalVisible(true);
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable onPress={open} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
            <Ionicons name="filter-outline" size={18} color="#111" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const apply = () => {
    setApplied({
      statuses: draft.statuses ?? [],
      from: draft.from?.trim() || undefined,
      to: draft.to?.trim() || undefined,
    });
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
      const pa = STATUS_PRIORITY[a.status];
      const pb = STATUS_PRIORITY[b.status];
      if (pa !== pb) return pa - pb;

      const ta = Date.parse(a.dateTime);
      const tb = Date.parse(b.dateTime);
      const active = a.status === 'confirmed' || a.status === 'pending';
      if (Number.isFinite(ta) && Number.isFinite(tb)) {
        return active ? ta - tb : tb - ta;
      }
      return 0;
    });
  }, [bookingsQuery.data?.items, applied.statuses]);

  return (
    <View style={styles.container}>
      {bookingsQuery.isLoading ? <Text style={styles.topText}>{t('appointments.loading')}</Text> : null}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('appointments.filtersTitle')}</Text>

            <Text style={styles.label}>{t('appointments.status')}</Text>
            <View style={styles.chipsRow}>
              <Pressable
                onPress={() => setDraft((s) => ({ ...s, statuses: [] }))}
                style={({ pressed }) => [
                  styles.chip,
                  (!draft.statuses || draft.statuses.length === 0) && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    (!draft.statuses || draft.statuses.length === 0) && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {STATUS_OPTIONS.map((opt) => {
                const selected = (draft.statuses ?? []).includes(opt);
                const label = t(`appointments.status_${opt}`);
                return (
                  <Pressable
                    key={opt}
                    onPress={() =>
                      setDraft((s) => {
                        const cur = s.statuses ?? [];
                        return selected
                          ? { ...s, statuses: cur.filter((x) => x !== opt) }
                          : { ...s, statuses: [...cur, opt] };
                      })
                    }
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{t('appointments.from')}</Text>
            <TextInput
              value={draft.from ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, from: v }))}
              autoCapitalize="none"
              placeholder="2025-01-01T00:00:00.000Z"
              style={styles.input}
            />

            <Text style={styles.label}>{t('appointments.to')}</Text>
            <TextInput
              value={draft.to ?? ''}
              onChangeText={(v) => setDraft((s) => ({ ...s, to: v }))}
              autoCapitalize="none"
              placeholder="2025-01-31T23:59:59.999Z"
              style={styles.input}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable onPress={reset} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>{t('appointments.reset')}</Text>
              </Pressable>
              <Pressable onPress={apply} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
                <Text style={styles.primaryBtnText}>{t('appointments.apply')}</Text>
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
        ListEmptyComponent={!bookingsQuery.isLoading ? <Text style={styles.topText}>{t('appointments.empty')}</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Pressable
              onPress={() => navigation.navigate('BookingDetails', { id: item.id, title: item.cafeName ?? item.id })}
              style={({ pressed }) => [pressed && styles.itemPressed]}
            >
              <View style={styles.itemTopRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.cafeName ?? 'Cafe'}
                </Text>
                {(() => {
                  const c = getStatusColors(item.status);
                  return (
                    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
                      <Text style={[styles.statusText, { color: c.text }]}>
                        {t(`appointments.status_${item.status}`)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Text style={styles.itemSub}>
                {formatDateTime(item.dateTime)} • {item.duration}m
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setQrTitle(item.cafeName ?? t('appointments.detailsTitle'));
                setQrValue(buildAppointmentQrPayload({ appointment: item, viewer }));
                setQrVisible(true);
              }}
              style={({ pressed }) => [styles.qrCard, pressed && styles.pressed]}
            >
              <View style={styles.qrPreview}>
                <QRCode value={buildAppointmentQrPayload({ appointment: item, viewer })} size={120} />
                <View pointerEvents="none" style={styles.qrCenterBadge}>
                  <Text style={styles.qrCenterBadgeText}>TC</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}
      />

      <FullscreenQrModal
        visible={qrVisible}
        title={qrTitle}
        value={qrValue}
        onClose={() => setQrVisible(false)}
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
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#111' },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemSub: { fontSize: 12, opacity: 0.7 },
  qrCard: {
    marginTop: 10,
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qrPreview: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  qrCenterBadge: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrCenterBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { borderColor: '#111', backgroundColor: '#111' },
  chipText: { fontSize: 12, color: '#111' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#111' },
  primaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pressed: { opacity: 0.85 }
});

