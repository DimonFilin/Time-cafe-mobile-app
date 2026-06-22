import { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  source: ImageSourcePropType;
  onClose: () => void;
};

export function FullscreenImageModal({ visible, source, onClose }: Props) {
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
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const contentStyle = useMemo(() => ({ opacity, transform: [{ scale }] }), [opacity, scale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.content, contentStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.imageWrap}>
            <Image source={source} style={styles.image} resizeMode="contain" />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
