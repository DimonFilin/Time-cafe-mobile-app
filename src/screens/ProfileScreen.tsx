import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { me } from '@/api/auth';
import { clearPersistedSession } from '@/auth/session';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';

export function ProfileScreen() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const sessionUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: me,
    enabled: isAuthenticated,
    initialData: sessionUser ?? undefined,
    retry: false,
  });

  const user = meQuery.data;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('auth.profile.title')}</Text>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => meQuery.refetch()}
            disabled={meQuery.isFetching}
            style={({ pressed }) => [
              styles.headerIcon,
              meQuery.isFetching && styles.disabled,
              pressed && !meQuery.isFetching && styles.pressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color="#111" />
          </Pressable>

          <Pressable
            onPress={() => {
              logout();
              queryClient.clear();
              void clearPersistedSession();
            }}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color="#b00020" />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.row}>
          <Text style={styles.k}>id</Text>: {user?.id ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>email</Text>: {user?.email ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>name</Text>: {(user?.firstName ?? '—')} {(user?.lastName ?? '')}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>balance</Text>: {user?.balance ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>role</Text>: {user?.role ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>createdAt</Text>: {user?.createdAt ?? '—'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5', marginBottom: 12 },
  row: { fontSize: 13, marginBottom: 6 },
  k: { fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});

