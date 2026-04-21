import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { cancelAppointment, getAppointmentById } from '@/api/appointments';
import { getMyOrders } from '@/api/orders';
import { getOrderChatByOrder } from '@/api/order-chat';
import { FullscreenQrModal } from '@/components/FullscreenQrModal';
import { MoneyAmount } from '@/components/currency/MoneyAmount';
import { t } from '@/i18n';
import type { BookingsStackParamList } from '@/navigation/stacks';
import { useAuthStore } from '@/store/authStore';
import { buildAppointmentQrPayload } from '@/utils/appointmentQr';
import { formatDateTime } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';

type Props = StackScreenProps<BookingsStackParamList, 'BookingDetails'>;

function getStatusColors(status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

export function BookingDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const viewer = useAuthStore((s) => s.user);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [qrVisible, setQrVisible] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean>(true);
  const [chatCheckLoading, setChatCheckLoading] = useState(false);

  const bookingQuery = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => getAppointmentById(id),
    retry: false,
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', id],
    queryFn: () => getMyOrders({ appointmentId: id, limit: 50 }),
    enabled: !!id,
  });

  const booking = bookingQuery.data;
  const orders = ordersQuery.data?.items ?? [];
  useEffect(() => {
    if (booking) {
      console.log('[BookingDetails] booking payload', booking);
    }
  }, [booking]);
  const canCancel = booking?.status === 'pending' || booking?.status === 'confirmed';
  const canOrder = booking?.status === 'pending' || booking?.status === 'confirmed';

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.setQueryData(['appointment', id], updated);
      setCancelModalVisible(false);
      setCancelReason('');
    },
  });

  const meta = useMemo(() => {
    if (!booking) return null;
    return `${t(`appointments.status_${booking.status}`)} • ${formatDateTime(booking.dateTime)} • ${booking.duration}m`;
  }, [booking?.status, booking?.dateTime, booking?.duration]);

  useEffect(() => {
    const loadChatEnabled = async () => {
      try {
        setChatCheckLoading(true);
        // Try booking id first; backend resolves order by id or by appointmentId fallback.
        const chat = await getOrderChatByOrder(id);
        setChatEnabled(chat.isEnabled !== false);
      } catch {
        // Keep default enabled when chat metadata cannot be resolved yet
        setChatEnabled(true);
      } finally {
        setChatCheckLoading(false);
      }
    };
    void loadChatEnabled();
  }, [id]);

  const qrValue = useMemo(() => {
    if (!booking) return '';
    return buildAppointmentQrPayload({ appointment: booking, viewer });
  }, [booking, viewer]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('appointments.detailsTitle')}</Text>
      {bookingQuery.isLoading ? <Text>Loading...</Text> : null}

      {booking ? (
        <>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.h1}>{booking.cafeName ?? 'Cafe'}</Text>
              {(() => {
                const c = getStatusColors(booking.status);
                return (
                  <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
                    <Text style={[styles.statusText, { color: c.text }]}>
                      {t(`appointments.status_${booking.status}`)}
                    </Text>
                  </View>
                );
              })()}
            </View>
            {meta ? <Text style={styles.meta}>{formatDateTime(booking.dateTime)} • {booking.duration}m</Text> : null}

            {booking.totalAmount ? (
              <View style={styles.kvRow}>
                <Text style={styles.k}>totalAmount</Text>
                <MoneyAmount value={booking.totalAmount} textStyle={styles.v} iconSize={13} />
              </View>
            ) : null}

            {booking.notes ? (
              <>
                <Text style={[styles.k, { marginTop: 10 }]}>notes</Text>
                <Text style={styles.vInline}>{booking.notes}</Text>
              </>
            ) : null}

          </View>

          <Pressable
            onPress={() => setQrVisible(true)}
            style={({ pressed }) => [styles.qrCard, pressed && styles.pressed]}
          >
            <View style={styles.qrPreview}>
              <QRCode value={qrValue} size={140} />
              <View pointerEvents="none" style={styles.qrCenterBadge}>
                <Image source={require('../../assets/favicon.png')} style={styles.qrCenterLogo} />
              </View>
            </View>
          </Pressable>

          {canOrder ? (
            <Pressable
              onPress={() =>
                navigation.navigate('OrderFromBooking', {
                  appointmentId: booking.id,
                  cafeId: booking.cafeId,
                  cafeName: booking.cafeName ?? undefined,
                })
              }
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>
                {orders.length > 0 ? 'Дозаказать' : 'Заказать'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            disabled={!chatEnabled || chatCheckLoading}
            onPress={() => {
              navigation.navigate('OrderChat', {
                orderId: id,
                cafeName: booking.cafeName ?? undefined,
              });
            }}
            style={({ pressed }) => [
              styles.chatBtn,
              (!chatEnabled || chatCheckLoading) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chatBtnText}>
              {chatCheckLoading
                ? 'Проверка чата...'
                : !chatEnabled
                  ? 'Чат отключен в кафе'
                  : 'Связаться с сотрудниками'}
            </Text>
          </Pressable>

          {orders.length > 0 ? (
            <View style={styles.ordersCard}>
              <Text style={styles.ordersTitle}>Мои заказы</Text>
              {orders.map((o) => (
                <Pressable
                  key={o.id}
                  style={styles.orderRow}
                  onPress={() =>
                    navigation.navigate('OrderChat', {
                      orderId: o.id,
                      cafeName: booking.cafeName ?? undefined,
                    })
                  }
                >
                  <Text style={styles.orderNumber}>#{o.orderNumber}</Text>
                  <Text style={styles.orderStatus}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Text>
                  <MoneyAmount
                    value={o.totalAmount}
                    textStyle={styles.orderTotal}
                    iconSize={14}
                    style={{ flexShrink: 0 }}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          {canCancel ? (
            <Pressable
              onPress={() => setCancelModalVisible(true)}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            >
              <Text style={styles.dangerBtnText}>{t('appointments.cancel')}</Text>
            </Pressable>
          ) : null}

          {cancelMutation.error ? <Text style={styles.error}>{getErrorMessage(cancelMutation.error)}</Text> : null}

          <Modal visible={cancelModalVisible} animationType="fade" transparent onRequestClose={() => setCancelModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('appointments.cancel')}</Text>
                <Text style={styles.label}>{t('appointments.cancelReason')}</Text>
                <TextInput value={cancelReason} onChangeText={setCancelReason} placeholder="..." style={styles.input} />

                <View style={styles.modalButtonsRow}>
                  <Pressable onPress={() => setCancelModalVisible(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                    <Text style={styles.secondaryBtnText}>{t('appointments.close')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={cancelMutation.isPending}
                    onPress={() => cancelMutation.mutate({ id, reason: cancelReason.trim() || undefined })}
                    style={({ pressed }) => [styles.dangerBtn, cancelMutation.isPending && styles.disabled, pressed && styles.pressed]}
                  >
                    <Text style={styles.dangerBtnText}>{t('appointments.cancelConfirm')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <FullscreenQrModal
            visible={qrVisible}
            title={booking.cafeName ?? t('appointments.detailsTitle')}
            value={qrValue}
            onClose={() => setQrVisible(false)}
          />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  h1: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, opacity: 0.7, marginBottom: 10 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 12, fontFamily: 'monospace', flexShrink: 1, textAlign: 'right' },
  vInline: { fontSize: 13 },
  error: { color: '#b00020', marginTop: 10 },
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flex: 1,
    paddingHorizontal: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#111', textAlign: 'center' },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' },
  chatBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  chatBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' },
  ordersCard: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5' },
  ordersTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  orderNumber: { fontSize: 13, fontWeight: '600', flex: 1 },
  orderStatus: { fontSize: 12, opacity: 0.8 },
  orderTotal: { fontSize: 13, fontWeight: '600' },
  dangerBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#b00020',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flex: 1,
    paddingHorizontal: 12,
  },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' },
  qrCard: {
    marginTop: 12,
    alignSelf: 'center',
    width: 168,
    height: 168,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qrPreview: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  qrCenterBadge: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrCenterLogo: { width: 24, height: 24, borderRadius: 8 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, backgroundColor: '#fff' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
});

