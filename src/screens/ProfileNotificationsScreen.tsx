import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
} from '@/api/wallet';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

function NotificationRow({
  id,
  title,
  body,
  date,
  unread,
  onDelete,
}: {
  id: string;
  title: string;
  body: string;
  date: string;
  unread: boolean;
  onDelete: () => void;
}) {
  const renderRight = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <Pressable onPress={onDelete} style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          Удалить
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <View style={[styles.card, unread && styles.cardUnread]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </Swipeable>
  );
}

export function ProfileNotificationsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['walletNotifications'],
    queryFn: getNotifications,
  });

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const list = await getNotifications();
        if (list.some((n) => !n.readAt)) {
          await markAllNotificationsRead();
          void queryClient.invalidateQueries({ queryKey: ['walletNotifications'] });
        }
      })();
    }, [queryClient]),
  );

  const items = data ?? [];

  const remove = async (id: string) => {
    await deleteNotification(id);
    void queryClient.invalidateQueries({ queryKey: ['walletNotifications'] });
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text style={styles.muted}>Загрузка…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>Уведомлений пока нет</Text>
      ) : (
        items.map((n) => (
          <NotificationRow
            key={n.id}
            id={n.id}
            title={n.title}
            body={n.body}
            date={`${new Date(n.createdAt).toLocaleString('ru-RU')}${!n.readAt ? ' · новое' : ''}`}
            unread={!n.readAt}
            onDelete={() => void remove(n.id)}
          />
        ))
      )}
      <Pressable style={styles.refresh} onPress={() => void refetch()} disabled={isFetching}>
        <Text style={styles.refreshText}>{isFetching ? 'Обновление…' : 'Обновить'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg, gap: Spacing.sm },
  muted: { fontSize: Typography.sm, color: Colors.textMuted },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardUnread: { borderColor: Colors.coffee },
  title: { fontSize: Typography.md, fontWeight: '700', color: Colors.textPrimary },
  body: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 6, lineHeight: 20 },
  date: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  deleteAction: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    marginLeft: Spacing.sm,
  },
  deleteText: { color: Colors.white, fontWeight: '700', fontSize: Typography.sm },
  refresh: { alignSelf: 'center', marginTop: Spacing.md, padding: Spacing.sm },
  refreshText: { fontSize: Typography.sm, color: Colors.coffeeDark, fontWeight: '600' },
});
