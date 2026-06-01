import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addCard, deleteCard, getCards, setDefaultCard, type AddCardInput, type Card } from '@/api/cards';
import { t } from '@/i18n';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

function digitsOnly(s: string, maxLen?: number) {
  const d = s.replace(/\D+/g, '');
  return typeof maxLen === 'number' ? d.slice(0, maxLen) : d;
}

function luhnCheck(cardNumberDigits: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumberDigits.length - 1; i >= 0; i--) {
    let digit = Number(cardNumberDigits[i]);
    if (!Number.isFinite(digit)) return false;
    if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.92;

export function CardsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');

  const cardsQuery = useQuery({ queryKey: ['cards'], queryFn: getCards, retry: false });

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerRight: () => (
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [Styles.headerIcon, { marginRight: Spacing.sm }, pressed && Styles.pressed]}
        >
          <Ionicons name="add-outline" size={20} color={Colors.coffeeDark} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const addMutation = useMutation({
    mutationFn: (input: AddCardInput) => addCard(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      setModalVisible(false);
      setCardNumber(''); setExpiryMonth(''); setExpiryYear(''); setCvv(''); setHolderName('');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultCard,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['cards'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['cards'] }); },
  });

  const sortedCards = useMemo(() => {
    return [...(cardsQuery.data ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }, [cardsQuery.data]);

  const monthNum = Number(expiryMonth);
  const yearNum = Number(expiryYear);
  const cardNumberValid = cardNumber.length === 16 && luhnCheck(cardNumber);
  const cvvValid = cvv.length === 3;
  const monthValid = Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12;
  const yearValid = Number.isFinite(yearNum) && String(expiryYear).length === 4 && yearNum >= 2000;
  const canSubmit = cardNumberValid && cvvValid && monthValid && yearValid;

  return (
    <View style={styles.container}>
      {/* Add card modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalSheetWrap, { maxHeight: SHEET_MAX_HEIGHT }]}
          >
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.lg, maxHeight: SHEET_MAX_HEIGHT }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t('cards.addCard') ?? 'Добавить карту'}</Text>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={Styles.label}>{t('cards.cardNumber') ?? 'Номер карты'}</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(digitsOnly(v, 16))}
                  keyboardType="number-pad"
                  maxLength={16}
                  style={Styles.input}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={Colors.textMuted}
                />

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={Styles.label}>{t('cards.expiryMonth') ?? 'Месяц'}</Text>
                    <TextInput
                      value={expiryMonth}
                      onChangeText={(v) => setExpiryMonth(digitsOnly(v, 2))}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={Styles.input}
                      placeholder="12"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={Styles.label}>{t('cards.expiryYear') ?? 'Год'}</Text>
                    <TextInput
                      value={expiryYear}
                      onChangeText={(v) => setExpiryYear(digitsOnly(v, 4))}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={Styles.input}
                      placeholder="2028"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <Text style={Styles.label}>{t('cards.cvv') ?? 'CVV'}</Text>
                <TextInput
                  value={cvv}
                  onChangeText={(v) => setCvv(digitsOnly(v, 3))}
                  keyboardType="number-pad"
                  maxLength={3}
                  secureTextEntry
                  style={Styles.input}
                  placeholder="123"
                  placeholderTextColor={Colors.textMuted}
                />

                <Text style={Styles.label}>{t('cards.holderName') ?? 'Имя держателя (необязательно)'}</Text>
                <TextInput
                  value={holderName}
                  onChangeText={setHolderName}
                  style={Styles.input}
                  placeholderTextColor={Colors.textMuted}
                />

                {addMutation.error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{t('cards.errorAdd') ?? 'Не удалось добавить карту'}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={({ pressed }) => [Styles.secondaryBtn, styles.modalBtn, pressed && Styles.pressed]}
                >
                  <Text style={Styles.secondaryBtnText}>{t('appointments.close') ?? 'Закрыть'}</Text>
                </Pressable>
                <Pressable
                  disabled={!canSubmit || addMutation.isPending}
                  onPress={() =>
                    addMutation.mutate({
                      cardNumber,
                      expiryMonth: monthNum,
                      expiryYear: yearNum,
                      cvv,
                      holderName: holderName.trim() || undefined,
                    })
                  }
                  style={({ pressed }) => [
                    Styles.primaryBtn,
                    styles.modalBtn,
                    (!canSubmit || addMutation.isPending) && Styles.disabled,
                    pressed && Styles.pressed,
                  ]}
                >
                  <Text style={Styles.primaryBtnText}>
                    {addMutation.isPending ? '...' : (t('cards.add') ?? 'Добавить')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <FlatList
        data={sortedCards}
        keyExtractor={(item) => item.id}
        refreshing={cardsQuery.isFetching}
        onRefresh={() => cardsQuery.refetch()}
        contentContainerStyle={
          sortedCards.length === 0
            ? styles.emptyContainer
            : [styles.listContent, { paddingBottom: insets.bottom + Spacing.lg }]
        }
        ListEmptyComponent={
          !cardsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyTitle}>{t('cards.empty') ?? 'Нет карт'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: Card }) => (
          <View style={styles.item}>
            <View style={styles.itemTopRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="card-outline" size={20} color={Colors.coffeeDark} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>
                  {item.cardType} •••• {item.last4Digits}
                </Text>
                <Text style={styles.itemSub}>
                  exp: {String(item.expiryMonth).padStart(2, '0')}/{item.expiryYear}
                  {' · '}{item.isActive ? (t('cards.active') ?? 'Активна') : (t('cards.inactive') ?? 'Неактивна')}
                </Text>
              </View>
              {item.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>{t('cards.default') ?? '★'}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              {!item.isDefault ? (
                <Pressable
                  onPress={() => setDefaultMutation.mutate(item.id)}
                  style={({ pressed }) => [styles.secondaryBtnSm, pressed && Styles.pressed]}
                >
                  <Text style={styles.secondaryBtnSmText}>{t('cards.setDefault') ?? 'По умолчанию'}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => deleteMutation.mutate(item.id)}
                style={({ pressed }) => [styles.dangerBtnSm, pressed && Styles.pressed]}
              >
                <Text style={styles.dangerBtnSmText}>{t('cards.delete') ?? 'Удалить'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },

  item: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardIconWrap: {
    width: 40, height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.beige,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  itemSub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  defaultBadge: {
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  defaultBadgeText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.success },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  secondaryBtnSm: {
    flex: 1, height: 36, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.coffeeDark,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnSmText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.coffeeDark },
  dangerBtnSm: {
    height: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtnSmText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textInverse },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheetWrap: { width: '100%' },
  modalCard: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.border,
    minHeight: '55%',
  },
  modalScrollContent: { paddingBottom: Spacing.sm, flexGrow: 1 },
  modalHandle: {
    width: 36, height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfField: { flex: 1 },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  errorText: { color: Colors.error, fontSize: Typography.sm },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1 },
});
