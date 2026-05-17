import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

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
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<BookingsStackParamList, 'BookingDetails'>;
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

function getStatusStyle(status: BookingStatus) {
  switch (status) {
    case 'confirmed': return { bg: Colors.successBg, text: Colors.success, icon: '✓' };
    case 'pending':   return { bg: Colors.warningBg, text: Colors.warning, icon: '⏳' };
    case 'completed': return { bg: Colors.infoBg,    text: Colors.info,    icon: '✔' };
    case 'cancelled': return { bg: Colors.errorBg,   text: Colors.error,   icon: '✕' };
  }
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает', CONFIRMED: 'Подтверждён', COMPLETED: 'Завершён', CANCELLED: 'Отменён',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { fontSize: Typography.sm, color: Colors.textMuted, flex: 1 },
  value: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary, flex: 2, textAlign: 'right' },
});

export function BookingDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const viewer = useAuthStore((s) => s.user);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [qrVisible, setQrVisible] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
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
  const firstOrderId = orders[0]?.id;
  const canCancel = booking?.status === 'pending' || booking?.status === 'confirmed';
  const canOrder  = booking?.status === 'pending' || booking?.status === 'confirmed';

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

  useEffect(() => {
    if (!ordersQuery.isFetched) return;

    const load = async () => {
      if (!firstOrderId) {
        setChatEnabled(false);
        setChatCheckLoading(false);
        return;
      }
      try {
        setChatCheckLoading(true);
        const chat = await getOrderChatByOrder(firstOrderId);
        setChatEnabled(chat.isEnabled !== false);
      } catch {
        setChatEnabled(true);
      } finally {
        setChatCheckLoading(false);
      }
    };
    void load();
  }, [ordersQuery.isFetched, firstOrderId]);

  const qrValue = useMemo(() => {
    if (!booking) return '';
    return buildAppointmentQrPayload({ appointment: booking, viewer });
  }, [booking, viewer]);

  if (bookingQuery.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!booking) return null;

  const statusStyle = getStatusStyle(booking.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Status hero card ── */}
      <View style={[styles.heroCard, { borderLeftColor: statusStyle.text }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Text style={styles.cafeName}>{booking.cafeName ?? 'Cafe'}</Text>
            <Text style={styles.heroDate}>{formatDateTime(booking.dateTime)}</Text>
            <Text style={styles.heroDuration}>{booking.duration} мин</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.icon} {t(`appointments.status_${booking.status}`)}
            </Text>
          </View>
        </View>
        {booking.totalAmount ? (
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t('appointments.totalAmount') ?? 'Итого'}</Text>
            <MoneyAmount value={booking.totalAmount} textStyle={styles.amountValue} iconSize={14} />
          </View>
        ) : null}
        {booking.notes ? (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        ) : null}
        {booking.roomName ? (
          <View style={styles.notesRow}>
            <Ionicons name="home-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.notesText}>{`Комната: ${booking.roomName}`}</Text>
          </View>
        ) : null}
      </View>

      {/* ── QR code ── */}
      <Pressable
        onPress={() => setQrVisible(true)}
        style={({ pressed }) => [styles.qrCard, pressed && Styles.pressed]}
      >
        <View style={styles.qrInner}>
          <QRCode value={qrValue || ' '} size={130} />
          <View pointerEvents="none" style={styles.qrBadge}>
            <Image source={require('../../assets/favicon.png')} style={styles.qrLogo} />
          </View>
        </View>
        <View style={styles.qrHint}>
          <Ionicons name="expand-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.qrHintText}>{'Нажмите для увеличения'}</Text>
        </View>
      </Pressable>

      {/* ── Actions ── */}
      <View style={styles.actionsRow}>
        {canOrder && (
          <Pressable
            onPress={() => navigation.navigate('OrderFromBooking', {
              appointmentId: booking.id,
              cafeId: booking.cafeId,
              cafeName: booking.cafeName ?? undefined,
            })}
            style={({ pressed }) => [Styles.primaryBtn, styles.actionBtn, pressed && Styles.pressed]}
          >
            <Ionicons name="restaurant-outline" size={16} color={Colors.textInverse} style={styles.btnIcon} />
            <Text style={[Styles.primaryBtnText, styles.actionBtnText]}>
              {orders.length > 0 ? t('orders.reorder') : t('orders.order')}
            </Text>
          </Pressable>
        )}

        <Pressable
          disabled={orders.length === 0 || !chatEnabled || chatCheckLoading}
          onPress={() => {
            const firstOrder = orders[0];
            if (!firstOrder) return;
            navigation.navigate('OrderChat', {
              orderId: firstOrder.id,
              cafeName: booking.cafeName ?? undefined,
            });
          }}
          style={({ pressed }) => [
            styles.chatBtn,
            styles.actionBtn,
            (orders.length === 0 || !chatEnabled || chatCheckLoading) && Styles.disabled,
            pressed && Styles.pressed,
          ]}
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.textInverse} style={styles.btnIcon} />
          <Text style={[styles.chatBtnText, styles.actionBtnText]}>
            {chatCheckLoading
              ? t('chat.checkingChat')
              : orders.length === 0
                ? t('chat.afterOrder')
                : !chatEnabled
                  ? t('chat.chatDisabled')
                  : t('chat.contactStaff')}
          </Text>
        </Pressable>
      </View>

      {/* ── Orders ── */}
      {orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orders.myOrders')}</Text>
          {orders.map((o, i) => (
            <Pressable
              key={o.id}
              onPress={() => navigation.navigate('OrderChat', { orderId: o.id, cafeName: booking.cafeName ?? undefined })}
              style={({ pressed }) => [
                styles.orderRow,
                i === orders.length - 1 && styles.orderRowLast,
                pressed && Styles.pressed,
              ]}
            >
              <View style={styles.orderLeft}>
                <Text style={styles.orderNumber}>#{o.orderNumber}</Text>
                <Text style={styles.orderStatus}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Text>
              </View>
              <MoneyAmount value={o.totalAmount} textStyle={styles.orderTotal} iconSize={13} />
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Cancel ── */}
      {canCancel && (
        <Pressable
          onPress={() => setCancelModalVisible(true)}
          style={({ pressed }) => [styles.dangerBtn, pressed && Styles.pressed]}
        >
          <Text style={styles.dangerBtnText}>{t('appointments.cancel')}</Text>
        </Pressable>
      )}

      {cancelMutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{getErrorMessage(cancelMutation.error)}</Text>
        </View>
      ) : null}

      {/* ── Cancel modal ── */}
      <Modal visible={cancelModalVisible} animationType="fade" transparent onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('appointments.cancel')}</Text>
            <Text style={Styles.label}>{t('appointments.cancelReason')}</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="..."
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setCancelModalVisible(false)}
                style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}
              >
                <Text style={Styles.secondaryBtnText}>{t('appointments.close')}</Text>
              </Pressable>
              <Pressable
                disabled={cancelMutation.isPending}
                onPress={() => cancelMutation.mutate({ id, reason: cancelReason.trim() || undefined })}
                style={({ pressed }) => [
                  styles.dangerBtn,
                  styles.modalBtn,
                  cancelMutation.isPending && Styles.disabled,
                  pressed && Styles.pressed,
                ]}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textMuted },

  // Hero card
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  heroLeft: { flex: 1 },
  cafeName: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  heroDate: { fontSize: Typography.base, color: Colors.textSecondary, fontWeight: '500' },
  heroDuration: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: Typography.xs, fontWeight: '700' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  amountLabel: { fontSize: Typography.sm, color: Colors.textMuted },
  amountValue: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: Spacing.sm },
  notesText: { fontSize: Typography.sm, color: Colors.textMuted, flex: 1 },

  // QR
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  qrInner: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  qrBadge: {
    position: 'absolute',
    width: 32, height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  qrLogo: { width: 22, height: 22, borderRadius: 6 },
  qrHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md },
  qrHintText: { fontSize: Typography.sm, color: Colors.textMuted },

  // Actions
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1 },
  actionBtnText: { flexShrink: 1, textAlign: 'center' },
  btnIcon: { marginRight: Spacing.xs },
  chatBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  chatBtnText: { color: Colors.textInverse, fontSize: Typography.sm, fontWeight: '600', textAlign: 'center', flexShrink: 1 },

  // Orders section
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderRowLast: { borderBottomWidth: 0 },
  orderLeft: { flex: 1 },
  orderNumber: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  orderStatus: { fontSize: Typography.sm, color: Colors.textMuted },
  orderTotal: { fontSize: Typography.base, fontWeight: '600', color: Colors.coffeeDark },

  // Danger
  dangerBtn: {
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textInverse },

  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.sm },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1 },
});
