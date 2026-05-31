import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { checkBackendHealth } from '@/api/health';
import { SHARED_API_URL } from '@/config/urls';
import { t } from '@/i18n';

export function DebugScreen() {
  const sharedApiUrl = SHARED_API_URL;

  const healthQuery = useQuery({
    queryKey: ['backend-health'],
    queryFn: checkBackendHealth,
    retry: false,
  });

  const statusLabel = useMemo(() => {
    if (healthQuery.isFetching && !healthQuery.data) return t('debug.checking');
    if (!healthQuery.data) return t('debug.noData');
    return healthQuery.data.ok ? t('debug.backendUp') : t('debug.backendDown');
  }, [healthQuery.data, healthQuery.isFetching]);

  const details = useMemo(() => {
    const data = healthQuery.data;
    if (!data) return null;

    const base = `HTTP ${data.status || '—'} • ${data.durationMs} ms`;
    if (!data.data) return base;

    try {
      return `${base}\n${JSON.stringify(data.data, null, 2)}`;
    } catch {
      return base;
    }
  }, [healthQuery.data]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {t('debug.backendCheck')}: {statusLabel}
      </Text>
      <Text style={styles.meta}>API: {sharedApiUrl}</Text>

      {details ? <Text style={styles.details}>{details}</Text> : null}

      <Pressable
        onPress={() => healthQuery.refetch()}
        disabled={healthQuery.isFetching}
        style={({ pressed }) => [
          styles.button,
          healthQuery.isFetching && styles.buttonDisabled,
          pressed && !healthQuery.isFetching && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {healthQuery.isFetching ? t('debug.checkingAgain') : t('debug.checkAgain')}
        </Text>
      </Pressable>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
  subtitle: { fontSize: 14, opacity: 0.8, marginBottom: 6, textAlign: 'left' },
  meta: { fontSize: 12, opacity: 0.6, marginBottom: 12, textAlign: 'left' },
  details: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 12,
  },
  button: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

