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
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import type { BookingsStackParamList } from '@/navigation/stacks';
import { getErrorMessage } from '@/utils/errors';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

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
        <Text style={styles.muted}>{t('orders.loading')}</Text>
      </View>
    );
  }

  if (error || !menu) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{getErrorMessage(error) || t('orders.menuUnavailable')}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('orders.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{cafeName ?? t('orders.title')}</Text>
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
                        <Text style={styles.addBtnText}>{t('orders.add')}</Text>
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
            <Text style={styles.cartTitle}>{t('orders.inOrder')}: {cart.length} {t('orders.positions')}</Text>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotalLabel}>{t('orders.total')}:</Text>
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
              {createOrderMutation.isPending ? t('orders.submitting') : t('orders.submit')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  muted: { marginTop: Spacing.sm, fontSize: Typography.base, color: Colors.textMuted },
  error: { fontSize: Typography.base, color: Colors.error, textAlign: 'center' },
  backBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.beige,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary },
  title: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  category: { marginBottom: Spacing.lg },
  categoryName: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.coffeeDark,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: Typography.base, fontWeight: '500', color: Colors.textPrimary },
  itemPrice: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 32, height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.beige,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '600', color: Colors.coffeeDark },
  qtyText: { minWidth: 24, textAlign: 'center', fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  addBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.coffeeDark,
    borderRadius: Radius.md,
  },
  addBtnText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textInverse },
  cartSummary: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.coffeeDark,
  },
  cartTitle: { fontSize: Typography.sm, color: Colors.textMuted },
  cartTotalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 4 },
  cartTotalLabel: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary },
  cartTotalAmount: { fontSize: Typography.xl, fontWeight: '700', color: Colors.coffeeDark },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerError: { fontSize: Typography.sm, color: Colors.error, marginBottom: Spacing.sm },
  submitBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.coffeeDark,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: Typography.lg, fontWeight: '600', color: Colors.textInverse },
});


