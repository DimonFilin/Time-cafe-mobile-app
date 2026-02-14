import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

type Props = {
  value: number;
  size?: number;
  color?: string;
  emptyColor?: string;
};

export function StarRating({ value, size = 14, color = '#F59E0B', emptyColor = '#E5E7EB' }: Props) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;

  return (
    <View style={styles.row}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const name = idx <= full ? 'star' : idx === full + 1 && hasHalf ? 'star-half' : 'star-outline';
        const tint = idx <= full || (idx === full + 1 && hasHalf) ? color : emptyColor;
        return <Ionicons key={idx} name={name as any} size={size} color={tint} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

