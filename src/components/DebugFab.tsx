import { Pressable, StyleSheet, Text } from 'react-native';

import { navigate } from '@/navigation/navigationRef';

export function DebugFab() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigate('Debug')}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Text style={styles.text}>DBG</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 6,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});

