import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMinutes, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createAppointment } from '@/api/appointments';
import {
  getCafeOccupancy,
  getCafeOccupancyRange,
  getCafeRoomAvailability,
  type RoomBillingMode,
} from '@/api/cafe-layout';
import { BookingDateField, occupancyRangeToMap } from '@/components/BookingDateCalendar';
import { getCards, type Card } from '@/api/cards';
import { BookingPlanMap } from '@/components/BookingPlanMap';
import { PlanMapErrorBoundary } from '@/components/PlanMapErrorBoundary';
import { MoneyAmount } from '@/components/currency/MoneyAmount';
import {
  billingModesAvailable,
  calculateRoomBookingPrice,
  isRoomSlotFree,
  parseRoomBilling,
} from '@/utils/room-billing';
import { t } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { formatDateTime, toIsoFromLocal } from '@/utils/dates';
import { errorBooking, logBooking, planPreviewStats } from '@/utils/booking-debug';
import { getErrorMessage } from '@/utils/errors';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<RootStackParamList, 'BookingCreate'>;

function SectionLabel({ children }: { children: string }) {
  return <Text style={sectionStyles.label}>{children}</Text>;
}
const sectionStyles = StyleSheet.create({
  label: { fontSize: Typography.sm, fontWeight: '700', color: Colors.coffeeDark, marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
});

export function BookingCreateScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { cafeId, cafeName } = route.params;

  const defaultDate = useMemo(() => format(addMinutes(new Date(), 30), 'yyyy-MM-dd'), []);
  const defaultTime = useMemo(() => format(addMinutes(new Date(), 30), 'HH:mm'), []);

  const [date, setDate] = useState(defaultDate);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(parseISO(defaultDate)));
  const [time, setTime] = useState(defaultTime);
  const [durationPreset, setDurationPreset] = useState(60);
  const [durationCustom, setDurationCustom] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'FREE' | 'CARD' | 'CASH'>('FREE');
  const [billingMode, setBillingMode] = useState<RoomBillingMode>('HOURLY');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSharedAssetIds, setSelectedSharedAssetIds] = useState<string[]>([]);
  const [cardPickerVisible, setCardPickerVisible] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const cardsQuery = useQuery({
    queryKey: ['cards'],
    queryFn: getCards,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const occupancyQuery = useQuery({
    queryKey: ['cafe-occupancy', cafeId, date],
    queryFn: () => getCafeOccupancy(cafeId, date),
    retry: false,
  });

  const handleCalendarMonth = useCallback((m: Date) => {
    setCalendarMonth(m);
  }, []);

  const monthFrom = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');
  const occupancyRangeQuery = useQuery({
    queryKey: ['cafe-occupancy-range', cafeId, monthFrom, monthTo],
    queryFn: () => getCafeOccupancyRange(cafeId, monthFrom, monthTo),
    retry: false,
  });
  const occupancyByDate = useMemo(
    () => occupancyRangeToMap(occupancyRangeQuery.data),
    [occupancyRangeQuery.data],
  );

  const roomAvailabilityQuery = useQuery({
    queryKey: ['room-availability', cafeId, date],
    queryFn: () => getCafeRoomAvailability(cafeId, date),
    retry: false,
  });

  const rooms = roomAvailabilityQuery.data?.rooms ?? [];
  const sharedAssets = roomAvailabilityQuery.data?.sharedAssets ?? [];
  const planPreview = roomAvailabilityQuery.data?.planPreview ?? null;

  useEffect(() => {
    logBooking('BookingCreate mount', { cafeId });
    return () => logBooking('BookingCreate unmount', { cafeId });
  }, [cafeId]);

  useEffect(() => {
    if (roomAvailabilityQuery.isLoading) {
      logBooking('availability loading');
      return;
    }
    if (roomAvailabilityQuery.isError) {
      errorBooking('availability error', roomAvailabilityQuery.error);
      return;
    }
    if (roomAvailabilityQuery.data) {
      logBooking('availability in screen', {
        rooms: roomAvailabilityQuery.data.rooms.length,
        plan: planPreviewStats(roomAvailabilityQuery.data.planPreview),
      });
    }
  }, [
    roomAvailabilityQuery.isLoading,
    roomAvailabilityQuery.isError,
    roomAvailabilityQuery.error,
    roomAvailabilityQuery.data,
  ]);
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );
  const roomBilling = useMemo(
    () => parseRoomBilling(selectedRoom?.billing),
    [selectedRoom?.billing],
  );
  const availableBillingModes = useMemo(
    () =>
      selectedRoom?.billingModes?.length
        ? selectedRoom.billingModes!
        : billingModesAvailable(roomBilling),
    [selectedRoom?.billingModes, roomBilling],
  );

  useEffect(() => {
    if (selectedRoomId) return;
    if (!rooms.length) return;
    setSelectedRoomId(rooms[0].roomId);
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!availableBillingModes.length) return;
    if (!availableBillingModes.includes(billingMode)) {
      setBillingMode(availableBillingModes[0]);
    }
  }, [availableBillingModes, billingMode]);

  const activeCards = useMemo(() => (cardsQuery.data ?? []).filter((c) => c.isActive), [cardsQuery.data]);
  const sortedCards = useMemo(() => [...activeCards].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)), [activeCards]);
  const selectedCard: Card | null = useMemo(() => sortedCards.find((c) => c.id === selectedCardId) ?? null, [sortedCards, selectedCardId]);

  useEffect(() => {
    if (paymentMethod !== 'CARD' || selectedCardId) return;
    const def = sortedCards.find((c) => c.isDefault) ?? sortedCards[0];
    if (def?.id) setSelectedCardId(def.id);
  }, [paymentMethod, selectedCardId, sortedCards]);

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.setQueryData(['appointment', created.id], created);
      navigation.reset({ index: 0, routes: [{ name: 'App', params: { screen: 'Bookings', params: { screen: 'BookingsList' } } }] });
      setTimeout(() => {
        navigation.navigate('App', { screen: 'Bookings', params: { screen: 'BookingDetails', params: { id: created.id, title: created.cafeName ?? created.id } } });
      }, 0);
    },
  });

  const durationNumber = durationCustom.trim() !== '' ? Number(durationCustom) : durationPreset;
  const durationValid = Number.isFinite(durationNumber) && durationNumber >= 15 && durationNumber <= 480;
  const dateTimeIso = useMemo(() => toIsoFromLocal(date, time), [date, time]);
  const dateTimeValid = !!dateTimeIso;
  const slotFree = useMemo(() => {
    if (!selectedRoom || !dateTimeIso || !durationValid) return false;
    return isRoomSlotFree(selectedRoom.slots, dateTimeIso, durationNumber);
  }, [selectedRoom, dateTimeIso, durationValid, durationNumber]);
  const totalPrice = useMemo(() => {
    if (!durationValid || !availableBillingModes.includes(billingMode)) return 0;
    return calculateRoomBookingPrice(durationNumber, billingMode, roomBilling);
  }, [durationValid, durationNumber, billingMode, roomBilling, availableBillingModes]);
  const cardValid = paymentMethod !== 'CARD' || !!selectedCardId;
  const paymentValid = totalPrice <= 0 || paymentMethod !== 'CARD' || !!selectedCardId;
  const canSubmit =
    !mutation.isPending &&
    durationValid &&
    dateTimeValid &&
    paymentValid &&
    !!selectedRoomId &&
    slotFree &&
    availableBillingModes.length > 0;

  const submitBooking = () => {
    if (!canSubmit || !selectedRoomId || !dateTimeIso) return;
    mutation.mutate({
      cafeId,
      roomId: selectedRoomId,
      dateTime: dateTimeIso,
      duration: durationNumber,
      billingMode,
      paymentMethod: totalPrice > 0 ? paymentMethod : 'FREE',
      cardId: paymentMethod === 'CARD' ? selectedCardId ?? undefined : undefined,
      notes: notes.trim() || undefined,
      selectedSharedAssetIds,
    });
    setConfirmVisible(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Cafe info */}
      <View style={styles.cafeCard}>
        <Ionicons name="cafe-outline" size={20} color={Colors.coffeeDark} />
        <Text style={styles.cafeName}>{cafeName ?? cafeId}</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Загруженность кафе</SectionLabel>
        <Text style={styles.previewText}>
          {occupancyQuery.data
            ? occupancyQuery.data.displayValue ??
              (occupancyQuery.data.occupancyMode === 'COUNT'
                ? `${occupancyQuery.data.totalAppointments} из ${occupancyQuery.data.totalCapacity || 0}`
                : `${occupancyQuery.data.occupancyPercent}%`)
            : '—'}
        </Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Комната на плане</SectionLabel>
        {roomAvailabilityQuery.isLoading ? (
          <Text style={styles.previewText}>Загрузка плана…</Text>
        ) : (
          <PlanMapErrorBoundary height={420}>
            <BookingPlanMap
              planPreview={planPreview}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
              height={420}
            />
          </PlanMapErrorBoundary>
        )}
        <View style={styles.chipsRow}>
          {rooms.map((room) => {
            const active = selectedRoomId === room.roomId;
            const busy =
              dateTimeIso && durationValid
                ? !isRoomSlotFree(room.slots, dateTimeIso, durationNumber)
                : false;
            return (
              <Pressable
                key={room.roomId}
                onPress={() => setSelectedRoomId(room.roomId)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  busy && styles.chipBusy,
                  pressed && Styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {room.name} ({room.capacity}){busy ? ' · занято' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedRoom && dateTimeValid && !slotFree && (
          <Text style={styles.errorInline}>
            На выбранное время комната «{selectedRoom.name}» уже забронирована
          </Text>
        )}
      </View>

      {selectedRoom?.description?.trim() ? (
        <View style={styles.section}>
          <SectionLabel>Дополнительная информация о комнате</SectionLabel>
          <Text style={styles.roomDescription}>{selectedRoom.description.trim()}</Text>
        </View>
      ) : null}

      {sharedAssets.length > 0 && (
        <View style={styles.section}>
          <SectionLabel>Дополнительное оборудование кафе</SectionLabel>
          <View style={styles.chipsRow}>
            {sharedAssets.map((asset) => {
              const active = selectedSharedAssetIds.includes(asset.id);
              return (
                <Pressable
                  key={asset.id}
                  onPress={() =>
                    setSelectedSharedAssetIds((prev) =>
                      prev.includes(asset.id)
                        ? prev.filter((id) => id !== asset.id)
                        : [...prev, asset.id],
                    )
                  }
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && Styles.pressed]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {asset.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Date & Time */}
      <View style={styles.section}>
        <SectionLabel>{t('appointments.createDate')}</SectionLabel>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateField}>
            <Text style={Styles.label}>{t('appointments.createDate')}</Text>
            <BookingDateField
              value={date}
              onChange={setDate}
              occupancyByDate={occupancyByDate}
              loading={occupancyRangeQuery.isLoading}
              onMonthChange={handleCalendarMonth}
            />
          </View>
          <View style={styles.timeField}>
            <Text style={Styles.label}>{t('appointments.createTime')}</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              autoCapitalize="none"
              placeholder="14:30"
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>
        {dateTimeIso ? (
          <View style={styles.previewRow}>
            <Ionicons name="calendar-outline" size={13} color={Colors.coffee} />
            <Text style={styles.previewText}>{formatDateTime(dateTimeIso)}</Text>
          </View>
        ) : (
          <Text style={styles.errorInline}>{t('appointments.invalidDateTime')}</Text>
        )}
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <SectionLabel>{t('appointments.createDuration')}</SectionLabel>
        <View style={styles.chipsRow}>
          {[30, 60, 90, 120].map((min) => {
            const active = durationCustom.trim() === '' && durationPreset === min;
            return (
              <Pressable
                key={min}
                onPress={() => { setDurationCustom(''); setDurationPreset(min); }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && Styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{min} мин</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={durationCustom}
          onChangeText={setDurationCustom}
          keyboardType="numeric"
          placeholder={`${t('appointments.createDurationCustom')} (15–480)`}
          style={Styles.input}
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      {availableBillingModes.length > 0 && (
        <View style={styles.section}>
          <SectionLabel>Тарификация</SectionLabel>
          <View style={styles.chipsRow}>
            {availableBillingModes.map((mode) => {
              const active = billingMode === mode;
              const hours =
                durationValid && mode === 'HOURLY'
                  ? Math.ceil(durationNumber / 60)
                  : null;
              const label =
                mode === 'HOURLY'
                  ? hours != null
                    ? `Почасовая · ${hours} ч`
                    : 'Почасовая'
                  : durationValid
                    ? `Поминутная · ${durationNumber} мин`
                    : 'Поминутная';
              return (
                <Pressable
                  key={mode}
                  onPress={() => setBillingMode(mode)}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && Styles.pressed]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {durationValid && (
            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                {billingMode === 'HOURLY' ? (
                  <Text style={styles.previewText}>
                    Округление до целых часов ({Math.ceil(durationNumber / 60)} ч)
                  </Text>
                ) : (
                  <Text style={styles.previewText}>{durationNumber} мин</Text>
                )}
              </View>
              <MoneyAmount value={totalPrice} textStyle={styles.priceAmount} />
            </View>
          )}
        </View>
      )}

      {/* Payment */}
      <View style={styles.section}>
        <SectionLabel>{t('appointments.createPaymentMethod')}</SectionLabel>
        <View style={styles.chipsRow}>
          {(['FREE', 'CARD', 'CASH'] as const).map((pm) => {
            const active = paymentMethod === pm;
            return (
              <Pressable
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && Styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`appointments.payment_${pm}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {paymentMethod === 'CARD' && (
          <View style={styles.cardSection}>
            <Text style={Styles.label}>{t('appointments.createCard')}</Text>
            {sortedCards.length ? (
              <Pressable
                onPress={() => setCardPickerVisible(true)}
                style={({ pressed }) => [styles.cardPicker, pressed && Styles.pressed]}
              >
                <Ionicons name="card-outline" size={16} color={Colors.coffeeDark} />
                <Text style={styles.cardPickerText}>
                  {selectedCard
                    ? `${selectedCard.cardType} •••• ${selectedCard.last4Digits}${selectedCard.isDefault ? ' ★' : ''}`
                    : t('appointments.selectCard')}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.noCardsWrap}>
                <Text style={styles.noCardsText}>{t('appointments.noCards')}</Text>
                <Pressable onPress={() => navigation.navigate('Cards')} style={({ pressed }) => [pressed && Styles.pressed]}>
                  <Text style={styles.linkText}>{t('appointments.manageCards')}</Text>
                </Pressable>
              </View>
            )}
            {!cardValid && <Text style={styles.errorInline}>{t('appointments.cardRequired') ?? 'Выберите карту'}</Text>}
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <SectionLabel>{t('appointments.createNotes')}</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="..."
          style={[Styles.input, styles.notesInput]}
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      {mutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{getErrorMessage(mutation.error)}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canSubmit}
        onPress={() => setConfirmVisible(true)}
        style={({ pressed }) => [Styles.primaryBtn, !canSubmit && Styles.disabled, pressed && canSubmit && Styles.pressed]}
      >
        <Text style={Styles.primaryBtnText}>
          {mutation.isPending ? '...' : 'Проверить и забронировать'}
        </Text>
      </Pressable>

      <Modal visible={confirmVisible} animationType="slide" transparent onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Подтверждение брони</Text>
            <Text style={styles.confirmLine}>Кафе: {cafeName ?? cafeId}</Text>
            <Text style={styles.confirmLine}>Комната: {selectedRoom?.name ?? '—'}</Text>
            <BookingPlanMap
              planPreview={planPreview}
              selectedRoomId={selectedRoomId}
              height={280}
              interactive={false}
            />
            <Text style={styles.confirmLine}>
              Дата: {dateTimeIso ? formatDateTime(dateTimeIso) : '—'}
            </Text>
            <Text style={styles.confirmLine}>Длительность: {durationNumber} мин</Text>
            <Text style={styles.confirmLine}>
              Тариф: {billingMode === 'HOURLY' ? 'почасовой' : 'поминутный'}
            </Text>
            <View style={styles.confirmPriceRow}>
              <Text style={styles.confirmPriceLabel}>К оплате:</Text>
              <MoneyAmount value={totalPrice} textStyle={styles.confirmPrice} />
            </View>
            {totalPrice > 0 && (
              <Text style={styles.confirmHint}>
                Способ оплаты: {t(`appointments.payment_${paymentMethod}`)}
              </Text>
            )}
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}
              >
                <Text style={Styles.secondaryBtnText}>Назад</Text>
              </Pressable>
              <Pressable
                disabled={mutation.isPending}
                onPress={submitBooking}
                style={({ pressed }) => [Styles.primaryBtn, styles.modalBtn, pressed && Styles.pressed]}
              >
                <Text style={Styles.primaryBtnText}>
                  {mutation.isPending ? '...' : 'Подтвердить'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card picker modal */}
      <Modal visible={cardPickerVisible} animationType="fade" transparent onRequestClose={() => setCardPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('appointments.selectCard')}</Text>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: Spacing.sm }}>
              {sortedCards.map((c) => {
                const active = selectedCardId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => { setSelectedCardId(c.id); setCardPickerVisible(false); }}
                    style={({ pressed }) => [styles.cardRow, active && styles.cardRowActive, pressed && Styles.pressed]}
                  >
                    <Ionicons name="card-outline" size={18} color={active ? Colors.textInverse : Colors.coffeeDark} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardRowText, active && styles.cardRowTextActive]}>
                        {c.cardType} •••• {c.last4Digits}{c.isDefault ? ' ★' : ''}
                      </Text>
                      <Text style={[styles.cardRowSub, active && styles.cardRowTextActive]}>
                        exp: {String(c.expiryMonth).padStart(2, '0')}/{c.expiryYear}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color={Colors.textInverse} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setCardPickerVisible(false)} style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}>
                <Text style={Styles.secondaryBtnText}>{t('appointments.close')}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Cards')} style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}>
                <Text style={Styles.secondaryBtnText}>{t('appointments.manageCards')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  cafeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.coffeeDark,
    padding: Spacing.md,
  },
  cafeName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, flex: 1 },

  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  dateTimeRow: { flexDirection: 'row', gap: Spacing.sm },
  dateField: { flex: 2 },
  timeField: { flex: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  previewText: { fontSize: Typography.sm, color: Colors.coffee, fontWeight: '500' },
  roomDescription: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

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
  chipRateRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  chipBusy: { borderColor: Colors.error, opacity: 0.75 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  priceAmount: { fontSize: Typography.lg, fontWeight: '800', color: Colors.coffeeDark },
  confirmLine: { fontSize: Typography.sm, color: Colors.textPrimary, marginBottom: Spacing.xs },
  confirmPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md },
  confirmPriceLabel: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  confirmPrice: { fontSize: Typography.xl, fontWeight: '800', color: Colors.coffeeDark },
  confirmHint: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.textInverse, fontWeight: '700' },

  cardSection: { marginTop: Spacing.sm },
  cardPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.beige,
  },
  cardPickerText: { flex: 1, fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  noCardsWrap: { gap: Spacing.xs },
  noCardsText: { fontSize: Typography.sm, color: Colors.textMuted },
  linkText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.coffee },

  notesInput: { height: 80, textAlignVertical: 'top', paddingTop: Spacing.sm },

  errorInline: { color: Colors.error, fontSize: Typography.sm, marginTop: Spacing.xs },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, backgroundColor: Colors.beige },
  cardRowActive: { borderColor: Colors.coffeeDark, backgroundColor: Colors.coffeeDark },
  cardRowText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  cardRowTextActive: { color: Colors.textInverse },
  cardRowSub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1 },
});
