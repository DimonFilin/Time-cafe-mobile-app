import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';

import { getMyScudCard } from '@/api/scud';
import { ScudCard } from '@/components/ScudCard';
import { Colors, Spacing } from '@/utils/theme';

export function ProfileScudScreen() {
  const scudQuery = useQuery({ queryKey: ['myScudCard'], queryFn: getMyScudCard });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScudCard card={scudQuery.data} loading={scudQuery.isLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
});
