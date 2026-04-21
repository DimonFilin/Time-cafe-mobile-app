import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCafeMenu, type MenuItem } from '@/api/menu';
import { MoneyAmount } from '@/components/currency/MoneyAmount';
import { createOrder } from '@/api/orders';
import { useAuthStore } from '@/store/authStore';
import type { BookingsStackParamList } from '@/navigation/stacks';
import { getErrorMessage } from '@/utils/errors';

type Props = StackScreenProps<BookingsStackParamList, 'OrderFromBooking'>;

interface CartEntry {
  item: MenuItem;
  quantity: number;
}

export function OrderFromBookingScreen({ route, navigation }: Props) {
  const { appointmentId, cafeId, cafeName } = route.params;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [cart, setCart] = useState<CartEntry[]>([]);

  const menuQuery = useQuery({
    queryKey: ['cafe-menu', cafeId],
    queryFn: () => getCafeMenu(cafeId),
  });

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['orders', appointmentId] });
      navigation.goBack();
    },
  });

  const addToCart = useCallback((item: MenuItem, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.item.id === item.id);
      if (existing) {
        const next = existing.quantity + qty;
        if (next <= 0) return prev.filter((e) => e.item.id !== item.id);
        return prev.map((e) =>
          e.item.id === item.id ? { ...e, quantity: next } : e
        );
      }
      if (qty <= 0) return prev;
      return [...prev, { item, quantity: qty }];
    });
  }, []);

  const totalSum = useMemo(() => {
    return cart.reduce((sum, e) => {
      const p = parseFloat(e.item.price);
      return sum + (Number.isFinite(p) ? p : 0) * e.quantity;
    }, 0);
  }, [cart]);

  const canSubmit = cart.length > 0 && user?.phone;
  const contactPhone = user?.phone ?? '+375290000000';

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    createOrderMutation.mutate({
      cafeId,
      appointmentId,
      items: cart.map((e) => ({
        itemName: e.item.name,
        quantity: e.quantity,
        unitPrice: parseFloat(e.item.price) || 0,
      })),
      deliveryType: 'IN_CAFE',
      contactPhone,
      paymentMethod: 'CASH',
    });
  }, [cafeId, appointmentId, cart, contactPhone, canSubmit, createOrderMutation]);

  const menu = menuQuery.data;
  const loading = menuQuery.isLoading;
  const error = menuQuery.error;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Загрузка меню...</Text>
      </View>
    );
  }

  if (error || !menu) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{getErrorMessage(error) || 'Меню недоступно'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{cafeName ?? 'Меню'}</Text>
        {menu.categories.map((cat) => (
          <View key={cat.id} style={styles.category}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            {cat.items.map((item) => {
              const inCart = cart.find((e) => e.item.id === item.id);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <MoneyAmount value={item.price} textStyle={styles.itemPrice} iconSize={13} style={{ marginTop: 2 }} />
                  </View>
                  <View style={styles.itemActions}>
                    {inCart ? (
                      <>
                        <Pressable
                          onPress={() => addToCart(item, -1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{inCart.quantity}</Text>
                        <Pressable
                          onPress={() => addToCart(item, 1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        onPress={() => addToCart(item, 1)}
                        style={styles.addBtn}
                      >
                        <Text style={styles.addBtnText}>Добавить</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        {cart.length > 0 ? (
          <View style={styles.cartSummary}>
            <Text style={styles.cartTitle}>В заказе: {cart.length} позиций</Text>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>Итого:</Text>
              <MoneyAmount value={totalSum} textStyle={styles.cartTotalAmount} iconSize={18} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {cart.length > 0 ? (
        <View style={styles.footer}>
          {createOrderMutation.error ? (
            <Text style={styles.footerError}>
              {getErrorMessage(createOrderMutation.error)}
            </Text>
          ) : null}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || createOrderMutation.isPending}
            style={[
              styles.submitBtn,
              (!canSubmit || createOrderMutation.isPending) && styles.submitBtnDisabled,
            ]}
          >
            <Text style={styles.submitBtnText}>
              {createOrderMutation.isPending ? 'Отправка...' : 'Оформить заказ'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  muted: { marginTop: 8, fontSize: 14, color: '#666' },
  error: { fontSize: 14, color: '#b00020', textAlign: 'center' },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#eee', borderRadius: 12 },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  category: { marginBottom: 20 },
  categoryName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemPrice: { fontSize: 13, color: '#666', marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '600' },
  qtyText: { minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#111', borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  cartSummary: { marginTop: 20, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12 },
  cartTitle: { fontSize: 14, color: '#666' },
  cartTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  cartTotalLabel: { fontSize: 18, fontWeight: '700' },
  cartTotalAmount: { fontSize: 18, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  footerError: { fontSize: 12, color: '#b00020', marginBottom: 8 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});


