import { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  visible: boolean;
  title?: string;
  value: string;
  onClose: () => void;
};

export function FullscreenQrModal({ visible, title, value, onClose }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 160,
      mass: 0.9,
    }).start();
  }, [visible]);

  const opacity = anim;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const contentStyle = useMemo(
    () => ({ opacity, transform: [{ scale }] }),
    [opacity, scale]
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.card, contentStyle]} onStartShouldSetResponder={() => true}>
          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.qrWrap}>
            <QRCode value={value} size={280} />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  qrWrap: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

