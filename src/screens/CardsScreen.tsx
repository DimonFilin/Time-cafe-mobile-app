import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { addCard, deleteCard, getCards, setDefaultCard, type AddCardInput, type Card } from '@/api/cards';

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
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function CardsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  const cardsQuery = useQuery({
    queryKey: ['cards'],
    queryFn: getCards,
    retry: false,
  });

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerRight: () => (
        <Pressable onPress={() => setModalVisible(true)} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
          <Ionicons name="add-outline" size={20} color="#111" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');

  const addMutation = useMutation({
    mutationFn: (input: AddCardInput) => addCard(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
      setModalVisible(false);
      setCardNumber('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvv('');
      setHolderName('');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultCard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  const sortedCards = useMemo(() => {
    const items = cardsQuery.data ?? [];
    return [...items].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }, [cardsQuery.data]);

  const monthNum = Number(expiryMonth);
  const yearNum = Number(expiryYear);

  const cardNumberValid = cardNumber.length === 16 && luhnCheck(cardNumber);
  const cvvValid = cvv.length === 3;
  const monthValid = Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12;
  const yearValid = Number.isFinite(yearNum) && String(expiryYear).length === 4 && yearNum >= 2000;

  const canSubmit = useMemo(() => {
    return cardNumberValid && cvvValid && monthValid && yearValid;
  }, [cardNumberValid, cvvValid, monthValid, yearValid]);

  const requirements = useMemo(() => {
    const lines: string[] = [
      `- Card number: 16 digits (Luhn)`,
      `- Expiry month: 1..12`,
      `- Expiry year: 4 digits`,
      `- CVV: 3 digits`,
    ];
    return lines.join('\n');
  }, []);

  const whyDisabled = useMemo(() => {
    if (canSubmit) return '';
    if (!cardNumberValid) return 'Card number must be 16 digits and valid (Luhn).';
    if (!monthValid) return 'Expiry month must be 1..12.';
    if (!yearValid) return 'Expiry year must be 4 digits.';
    if (!cvvValid) return 'CVV must be exactly 3 digits.';
    return 'Fill all required fields.';
  }, [canSubmit, cardNumberValid, monthValid, yearValid, cvvValid]);

  return (
    <View style={styles.container}>
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add card</Text>

            <Text style={styles.label}>Card number</Text>
            <TextInput
              value={cardNumber}
              onChangeText={(v) => setCardNumber(digitsOnly(v, 16))}
              keyboardType="number-pad"
              maxLength={16}
              style={styles.input}
              placeholder="4242424242424242"
            />
            <Text style={styles.hint}>16 digits, Luhn.</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expiry month</Text>
                <TextInput
                  value={expiryMonth}
                  onChangeText={(v) => setExpiryMonth(digitsOnly(v, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.input}
                  placeholder="12"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expiry year</Text>
                <TextInput
                  value={expiryYear}
                  onChangeText={(v) => setExpiryYear(digitsOnly(v, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  placeholder="2028"
                />
              </View>
            </View>

            <Text style={styles.label}>CVV</Text>
            <TextInput
              value={cvv}
              onChangeText={(v) => setCvv(digitsOnly(v, 3))}
              keyboardType="number-pad"
              maxLength={3}
              secureTextEntry
              style={styles.input}
              placeholder="123"
            />

            <Text style={styles.label}>Holder name (optional)</Text>
            <TextInput value={holderName} onChangeText={setHolderName} style={styles.input} />

            <Text style={styles.requirements}>{requirements}</Text>
            {!canSubmit ? <Text style={styles.whyDisabled}>{whyDisabled}</Text> : null}
            {addMutation.error ? <Text style={styles.error}>Failed to add card.</Text> : null}

            <View style={styles.modalButtonsRow}>
              <Pressable onPress={() => setModalVisible(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>Close</Text>
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
                style={({ pressed }) => [styles.primaryBtn, (!canSubmit || addMutation.isPending) && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={sortedCards}
        keyExtractor={(item) => item.id}
        refreshing={cardsQuery.isFetching}
        onRefresh={() => cardsQuery.refetch()}
        ListEmptyComponent={!cardsQuery.isLoading ? <Text style={styles.topText}>No cards</Text> : null}
        renderItem={({ item }: { item: Card }) => (
          <View style={styles.item}>
            <View style={styles.itemTopRow}>
              <Text style={styles.itemTitle}>
                {item.cardType} •••• {item.last4Digits}
              </Text>
              {item.isDefault ? <Text style={styles.badge}>Default</Text> : null}
            </View>
            <Text style={styles.itemSub}>
              exp: {String(item.expiryMonth).padStart(2, '0')}/{item.expiryYear} • {item.isActive ? 'active' : 'inactive'}
            </Text>

            <View style={styles.actionsRow}>
              {!item.isDefault ? (
                <Pressable
                  onPress={() => setDefaultMutation.mutate(item.id)}
                  style={({ pressed }) => [styles.secondaryBtnSmall, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryBtnText}>Set default</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => deleteMutation.mutate(item.id)}
                style={({ pressed }) => [styles.dangerBtnSmall, pressed && styles.pressed]}
              >
                <Text style={styles.dangerBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topText: { padding: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  badge: { fontSize: 11, fontWeight: '700', color: '#065F46', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, marginBottom: 10 },
  hint: { fontSize: 12, opacity: 0.6, marginBottom: 10 },
  requirements: { fontSize: 12, opacity: 0.8, marginTop: 6 },
  whyDisabled: { fontSize: 12, color: '#92400E', marginTop: 8 },
  error: { fontSize: 12, color: '#b00020', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  modalButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnSmall: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: '#111' },
  primaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  dangerBtnSmall: { width: 92, height: 36, borderRadius: 10, backgroundColor: '#b00020', alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 }
});

