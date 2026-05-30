import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import type { OrderChatAuthorWorker } from '@/api/order-chat';
import { resolveFileUrl } from '@/utils/files';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = {
  worker: OrderChatAuthorWorker | null;
  visible: boolean;
  onClose: () => void;
};

function workerName(worker: OrderChatAuthorWorker): string {
  return `${worker.firstName} ${worker.lastName}`.trim() || t('chat.workerProfileTitle');
}

export function WorkerPublicProfileModal({ worker, visible, onClose }: Props) {
  if (!worker) return null;

  const name = workerName(worker);
  const avatarUri = worker.avatarUrl ? resolveFileUrl(worker.avatarUrl) || worker.avatarUrl : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{name}</Text>
          {worker.cafeName ? (
            <Text style={styles.cafe}>
              {t('chat.workerCafe')}: {worker.cafeName}
            </Text>
          ) : null}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.coffeeDark,
  },
  name: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cafe: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  closeBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
});
