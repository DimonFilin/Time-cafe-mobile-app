import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  confirmTopUp,
  getMyWallet,
  previewTopUp,
  type TopUpPreview,
} from '../api/wallet';
import { getCards, type Card } from '../api/cards';
import { HelpHint } from '@/components/HelpHint';
import { MoneyAmount } from '../components/currency/MoneyAmount';
import { HINT_ANTICAFE_DEPOSIT } from '@/constants/wallet-hints';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

export function WalletScreen() {
  const qc = useQueryClient();
  const { data: wallet, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['myWallet'],
    queryFn: getMyWallet,
  });
  const cardsQuery = useQuery({ queryKey: ['cards'], queryFn: getCards });
  const [amount, setAmount] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardPickerVisible, setCardPickerVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const sortedCards = useMemo(() => {
    const list = cardsQuery.data ?? [];
    return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }, [cardsQuery.data]);

  useEffect(() => {
    if (!selectedCardId && sortedCards.length) {
      setSelectedCardId(sortedCards.find((c) => c.isDefault)?.id ?? sortedCards[0].id);
    }
  }, [sortedCards, selectedCardId]);

  const selectedCard = sortedCards.find((c) => c.id === selectedCardId) ?? null;

  const topUpMutation = useMutation({
    mutationFn: (sum: number) =>
      confirmTopUp(sum, {
        paymentType: selectedCard ? 'TOP_UP_CARD' : 'TOP_UP_MOBILE',
        cardId: selectedCard?.id,
      }),
    onSuccess: (data) => {
      setAmount('');
      void qc.invalidateQueries({ queryKey: ['myWallet', 'walletNotifications'] });
      Alert.alert('Готово', data?.message ?? 'Депозит в антикафе пополнен');
    },
    onError: () => {
      Alert.alert('Ошибка', 'Не удалось пополнить депозит');
    },
  });

  const onPreview = async () => {
    const sum = Number(amount.replace(',', '.'));
    if (!Number.isFinite(sum) || sum <= 0) return;
    if (!selectedCard) {
      Alert.alert('Карта', 'Выберите карту для оплаты');
      return;
    }
    setPreviewLoading(true);
    try {
      const p: TopUpPreview = await previewTopUp(sum, {
        paymentType: 'TOP_UP_CARD',
        cardId: selectedCard.id,
      });
      const cardLabel = `${selectedCard.cardType} •••• ${selectedCard.last4Digits}`;
      Alert.alert(
        'Пополнение депозита',
        [
          `С карты: ${cardLabel}`,
          `Сумма: ${sum.toFixed(2)} BYN`,
          p.willAccrue
            ? `Бонус ~${p.hypotheticBonus} BYN — ${new Date(p.scheduledAt).toLocaleDateString('ru-RU')}`
            : 'Бонус по этому пополнению не начисляется',
        ].join('\n'),
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Оплатить', onPress: () => topUpMutation.mutate(sum) },
        ],
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const loading = isLoading || (!wallet && isFetching);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.coffee} />
        <Text style={styles.loadingText}>Загрузка депозита…</Text>
      </View>
    );
  }

  if (!wallet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Не удалось загрузить кошелёк</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Депозит в антикафе</Text>
          <Text style={styles.subtitle}>Единый счёт сети антикафе</Text>
        </View>
        <HelpHint
          title={HINT_ANTICAFE_DEPOSIT.title}
          body={HINT_ANTICAFE_DEPOSIT.body}
          iconSize={24}
          iconColor={Colors.coffeeDark}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>На депозите</Text>
        <MoneyAmount value={wallet.depositBalance} iconSize={32} textStyle={styles.amount} />
        {wallet.debt > 0 && (
          <>
            <Text style={[styles.label, { marginTop: Spacing.sm }]}>Долг</Text>
            <MoneyAmount value={wallet.debt} iconSize={22} textStyle={styles.debt} />
          </>
        )}
        {wallet.loyaltyTier && (
          <Text style={styles.tier}>
            {wallet.loyaltyTier.name} · бонус {Number(wallet.loyaltyTier.bonusPercent)}%
          </Text>
        )}
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <Text style={styles.pending}>
            Ожидается бонусов: {wallet.pendingBonusTotal.toFixed(2)}{' '}
            <Text style={styles.pendingUnit}>BYN</Text> {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
        {expanded &&
          wallet.pendingBonuses.map((p) => (
            <Text key={p.id} style={styles.pendingItem}>
              +{Number(p.bonusAmount).toFixed(0)} BYN —{' '}
              {new Date(p.scheduledAt).toLocaleDateString('ru-RU')}
            </Text>
          ))}
      </View>

      <Text style={styles.section}>Пополнение с карты</Text>
      {cardsQuery.isLoading ? (
        <ActivityIndicator color={Colors.coffee} style={{ marginVertical: Spacing.sm }} />
      ) : sortedCards.length ? (
        <Pressable
          onPress={() => setCardPickerVisible(true)}
          style={({ pressed }) => [styles.cardPicker, pressed && Styles.pressed]}
        >
          <Ionicons name="card-outline" size={20} color={Colors.coffeeDark} />
          <Text style={styles.cardPickerText}>
            {selectedCard
              ? `${selectedCard.cardType} •••• ${selectedCard.last4Digits}`
              : 'Выберите карту'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </Pressable>
      ) : (
        <Text style={styles.muted}>Добавьте карту в профиле → «Банковские карты»</Text>
      )}

      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Сумма пополнения"
        placeholderTextColor={Colors.textMuted}
        value={amount}
        onChangeText={setAmount}
      />

      <Pressable
        onPress={() => void onPreview()}
        disabled={topUpMutation.isPending || previewLoading || !selectedCard}
        style={({ pressed }) => [
          Styles.primaryBtn,
          (topUpMutation.isPending || previewLoading || !selectedCard) && Styles.disabled,
          pressed && Styles.pressed,
        ]}
      >
        {topUpMutation.isPending || previewLoading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={Styles.primaryBtnText}>Пополнить депозит</Text>
        )}
      </Pressable>

      <Modal visible={cardPickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setCardPickerVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Карта для оплаты</Text>
            {sortedCards.map((c: Card) => (
              <Pressable
                key={c.id}
                style={styles.modalRow}
                onPress={() => {
                  setSelectedCardId(c.id);
                  setCardPickerVisible(false);
                }}
              >
                <Text>
                  {c.cardType} •••• {c.last4Digits}
                  {c.isDefault ? ' ★' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  loadingText: { color: Colors.textMuted, fontSize: Typography.base },
  muted: { color: Colors.textMuted, fontSize: Typography.sm },
  retryBtn: { padding: Spacing.sm },
  retryText: { color: Colors.coffeeDark, fontWeight: '600' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  card: { ...Styles.card, gap: Spacing.sm, paddingVertical: Spacing.lg },
  label: { fontSize: Typography.sm, color: Colors.textMuted },
  amount: { fontSize: 40, fontWeight: '800', color: Colors.textPrimary, lineHeight: 44 },
  debt: { fontSize: Typography.xl, color: Colors.error, fontWeight: '700' },
  tier: { fontSize: Typography.base, marginTop: Spacing.sm, color: Colors.textSecondary },
  pending: { fontSize: Typography.base, color: Colors.coffee, marginTop: Spacing.sm, fontWeight: '600' },
  pendingUnit: { fontWeight: '400', color: Colors.textMuted },
  pendingItem: { fontSize: Typography.sm, color: Colors.textMuted, marginLeft: Spacing.sm },
  section: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  cardPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.cream,
  },
  cardPickerText: { flex: 1, fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  input: { ...Styles.input, marginBottom: Spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: '700', marginBottom: Spacing.sm },
  modalRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
});
