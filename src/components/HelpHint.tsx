import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = {
  title: string;
  body: string;
  iconSize?: number;
  iconColor?: string;
};

export function HelpHint({ title, body, iconSize = 20, iconColor = Colors.textMuted }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel={`Подсказка: ${title}`}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Ionicons name="help-circle-outline" size={iconSize} color={iconColor} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.bubble} onPress={(e) => e.stopPropagation()}>
            <View style={styles.bubbleHeader}>
              <Text style={styles.bubbleTitle}>{title}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.bubbleBody}>{body}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { marginLeft: 6 },
  pressed: { opacity: 0.7 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingHorizontal: Spacing.lg,
  },
  bubble: {
    maxWidth: 320,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bubbleTitle: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.coffeeDark,
  },
  bubbleBody: {
    fontSize: Typography.sm,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
