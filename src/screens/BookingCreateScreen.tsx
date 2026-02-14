import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMinutes, format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createAppointment } from '@/api/appointments';
import { getCards, type Card } from '@/api/cards';
import { t } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { formatDateTime, toIsoFromLocal } from '@/utils/dates';
import { getErrorMessage } from '@/utils/errors';

type Props = StackScreenProps<RootStackParamList, 'BookingCreate'>;

export function BookingCreateScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { cafeId, cafeName } = route.params;

  const defaultDate = useMemo(() => format(addMinutes(new Date(), 30), 'yyyy-MM-dd'), []);
  const defaultTime = useMemo(() => format(addMinutes(new Date(), 30), 'HH:mm'), []);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  const [durationPreset, setDurationPreset] = useState<number>(60);
  const [durationCustom, setDurationCustom] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'FREE' | 'BALANCE' | 'CARD' | 'CASH'>('FREE');
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

  const activeCards = useMemo(() => {
    const cards = cardsQuery.data ?? [];
    return cards.filter((c) => c.isActive);
  }, [cardsQuery.data]);

  const sortedCards = useMemo(() => {
    return [...activeCards].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }, [activeCards]);

  const selectedCard: Card | null = useMemo(() => {
    if (!selectedCardId) return null;
    return sortedCards.find((c) => c.id === selectedCardId) ?? null;
  }, [sortedCards, selectedCardId]);

  useEffect(() => {
    if (paymentMethod !== 'CARD') return;
    if (selectedCardId) return;
    const def = sortedCards.find((c) => c.isDefault) ?? sortedCards[0];
    if (def?.id) setSelectedCardId(def.id);
  }, [paymentMethod, selectedCardId, sortedCards]);

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.setQueryData(['appointment', created.id], created);

      navigation.reset({
        index: 0,
        routes: [{ name: 'App', params: { screen: 'Bookings', params: { screen: 'BookingsList' } } }],
      });

      setTimeout(() => {
        navigation.navigate('App', {
          screen: 'Bookings',
          params: {
            screen: 'BookingDetails',
            params: { id: created.id, title: created.cafeName ?? created.id },
          },
        });
      }, 0);
    },
  });

  const durationNumber = durationCustom.trim() !== '' ? Number(durationCustom) : durationPreset;
  const durationValid = Number.isFinite(durationNumber) && durationNumber >= 15 && durationNumber <= 480;

  const dateTimeIso = useMemo(() => toIsoFromLocal(date, time), [date, time]);
  const dateTimeValid = !!dateTimeIso;
  const cardValid = paymentMethod !== 'CARD' || !!selectedCardId;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('appointments.createTitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.k}>{t('appointments.createCafe')}</Text>
        <Text style={styles.v}>{cafeName ?? cafeId}</Text>

        <Text style={[styles.k, { marginTop: 12 }]}>{t('appointments.createDate')}</Text>
        <TextInput value={date} onChangeText={setDate} autoCapitalize="none" placeholder="2025-01-15" style={styles.input} />

        <Text style={[styles.k, { marginTop: 12 }]}>{t('appointments.createTime')}</Text>
        <TextInput value={time} onChangeText={setTime} autoCapitalize="none" placeholder="14:30" style={styles.input} />

        <Text style={styles.hint}>
          {t('appointments.createDateTimePreview')}: {dateTimeIso ? formatDateTime(dateTimeIso) : t('appointments.invalidDateTime')}
        </Text>

        <Text style={[styles.k, { marginTop: 12 }]}>{t('appointments.createDuration')}</Text>
        <View style={styles.row}>
          {[30, 60, 90, 120].map((min) => {
            const active = durationCustom.trim() === '' && durationPreset === min;
            return (
              <Pressable
                key={min}
                onPress={() => {
                  setDurationCustom('');
                  setDurationPreset(min);
                }}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{min}m</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={durationCustom}
          onChangeText={setDurationCustom}
          keyboardType="numeric"
          placeholder={`${t('appointments.createDurationCustom')} (15..480)`}
          style={styles.input}
        />

        <Text style={[styles.k, { marginTop: 12 }]}>{t('appointments.createPaymentMethod')}</Text>
        <View style={styles.row}>
          {(['FREE', 'BALANCE', 'CARD', 'CASH'] as const).map((pm) => {
            const active = paymentMethod === pm;
            return (
              <Pressable
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`appointments.payment_${pm}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        {paymentMethod === 'CARD' ? (
          <>
            <Text style={[styles.k, { marginTop: 6 }]}>{t('appointments.createCard')}</Text>

            {sortedCards.length ? (
              <Pressable
                onPress={() => setCardPickerVisible(true)}
                style={({ pressed }) => [styles.cardPicker, pressed && styles.pressed]}
              >
                <Text style={styles.cardPickerText}>
                  {selectedCard
                    ? `${selectedCard.cardType} •••• ${selectedCard.last4Digits}${selectedCard.isDefault ? ' (Default)' : ''}`
                    : t('appointments.selectCard')}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.noCardsWrap}>
                <Text style={styles.noCardsText}>{t('appointments.noCards')}</Text>
                <Pressable onPress={() => navigation.navigate('Cards')} style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}>
                  <Text style={styles.linkBtnText}>{t('appointments.manageCards')}</Text>
                </Pressable>
              </View>
            )}

            {!cardValid ? <Text style={styles.errorInline}>Card is required.</Text> : null}
          </>
        ) : null}

        <Text style={[styles.k, { marginTop: 12 }]}>{t('appointments.createNotes')}</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="..." style={styles.input} />
      </View>

      {mutation.error ? <Text style={styles.error}>{getErrorMessage(mutation.error)}</Text> : null}

      <Pressable
        disabled={mutation.isPending || !durationValid || !dateTimeValid || !cardValid}
        onPress={() =>
          mutation.mutate({
            cafeId,
            dateTime: dateTimeIso!,
            duration: durationNumber,
            paymentMethod,
            cardId: paymentMethod === 'CARD' ? selectedCardId ?? undefined : undefined,
            notes: notes.trim() || undefined,
          })
        }
        style={({ pressed }) => [
          styles.primaryBtn,
          (mutation.isPending || !durationValid || !dateTimeValid || !cardValid) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryBtnText}>{t('appointments.createSubmit')}</Text>
      </Pressable>

      <Modal visible={cardPickerVisible} animationType="fade" transparent onRequestClose={() => setCardPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('appointments.selectCard')}</Text>

            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 10 }}>
              {sortedCards.map((c) => {
                const active = selectedCardId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelectedCardId(c.id);
                      setCardPickerVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.cardRow,
                      active && styles.cardRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.cardRowText, active && styles.cardRowTextActive]}>
                      {c.cardType} •••• {c.last4Digits}
                      {c.isDefault ? ' (Default)' : ''}
                    </Text>
                    <Text style={[styles.cardRowSub, active && styles.cardRowTextActive]}>
                      exp: {String(c.expiryMonth).padStart(2, '0')}/{c.expiryYear}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <Pressable onPress={() => setCardPickerVisible(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>{t('appointments.close')}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Cards')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>{t('appointments.manageCards')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5' },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  v: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#111', backgroundColor: '#111' },
  chipText: { fontSize: 12, color: '#111' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  hint: { marginTop: 6, fontSize: 12, opacity: 0.6 },
  cardPicker: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardPickerText: { fontSize: 13, fontWeight: '700' },
  noCardsWrap: { paddingVertical: 6, gap: 6, marginBottom: 8 },
  noCardsText: { fontSize: 12, opacity: 0.75 },
  linkBtn: { paddingVertical: 6, alignSelf: 'flex-start' },
  linkBtnText: { fontSize: 12, fontWeight: '800', color: '#111' },
  errorInline: { color: '#b00020', marginBottom: 6, fontSize: 12 },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  error: { color: '#b00020', marginTop: 10 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  cardRow: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  cardRowActive: { borderColor: '#111', backgroundColor: '#111' },
  cardRowText: { fontSize: 13, fontWeight: '800', color: '#111' },
  cardRowTextActive: { color: '#fff' },
  cardRowSub: { fontSize: 12, opacity: 0.7, marginTop: 6, color: '#111' },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 13, fontWeight: '800', color: '#111' },
});

