import type { StackScreenProps } from '@react-navigation/stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

import type { BookingsStackParamList } from '@/navigation/stacks';
import {
  getOrderChatByOrder,
  getOrderChatMessages,
  OrderChatAuthorWorker,
  OrderChatMessage,
  sendOrderChatMessage,
  uploadOrderChatAttachment,
} from '@/api/order-chat';
import { WorkerPublicProfileModal } from '@/components/WorkerPublicProfileModal';
import { t } from '@/i18n';
import { getSharedApiOrigin } from '@/config/urls';
import { useAuthStore } from '@/store/authStore';
import { resolveFileUrl } from '@/utils/files';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = StackScreenProps<BookingsStackParamList, 'OrderChat'>;

export function OrderChatScreen({ route }: Props) {
  const { orderId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const attachmentThumbWidth = Math.round(windowWidth * 0.4);
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OrderChatMessage[]>([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string }>>([]);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [workerProfile, setWorkerProfile] = useState<OrderChatAuthorWorker | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const appendUniqueMessage = (list: OrderChatMessage[], next: OrderChatMessage) => {
    if (list.some((m) => m.id === next.id)) {
      return list;
    }
    return [...list, next];
  };

  useEffect(() => {
    console.log('[OrderChat] load chat by order/booking id', { orderId });
    getOrderChatByOrder(orderId)
      .then((chat) => {
        console.log('[OrderChat] chat resolved', chat);
        setChatId(chat.id);
        return getOrderChatMessages(chat.id);
      })
      .then((items) => {
        console.log('[OrderChat] messages loaded', { count: items.length });
        const ordered = [...items].reverse();
        const deduped = ordered.filter(
          (msg, index, arr) => arr.findIndex((x) => x.id === msg.id) === index,
        );
        setMessages(deduped);
      })
      .catch((e) => console.error('[OrderChat] load chat failed', e));
  }, [orderId]);

  useEffect(() => {
    if (!chatId || !user) return;
    const base = getSharedApiOrigin();
    console.log('[OrderChat] connecting socket', { base, chatId, hasToken: Boolean(token) });
    const s = io(`${base}/order-chats`, {
      // Сначала polling: через ngrok/прокси без стабильного WS чаще работает, чем «websocket» первым.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      auth: token ? { token } : undefined,
      // В React Native не браузерные cookies; true иногда ломает рукопожатие вне localhost.
      withCredentials: false,
    });
    s.on('connect', () => {
      console.log('[OrderChat] socket connected', { id: s.id });
      s.emit('chat:join', { chatId });
    });
    s.on('connect_error', (err) =>
      console.error('[OrderChat] socket connect error', { message: err.message }),
    );
    s.on('disconnect', (reason) =>
      console.log('[OrderChat] socket disconnected', { reason }),
    );
    s.on('chat:message:new', (message: OrderChatMessage) => {
      console.log('[OrderChat] incoming message', { messageId: message.id, chatId: message.chatId });
      if (message.chatId === chatId) {
        setMessages((prev) => appendUniqueMessage(prev, message));
      }
    });
    s.on('chat:typing', (event: { actorId?: string; typing?: boolean }) => {
      if (event.actorId && event.actorId !== user.id) {
        setIsRemoteTyping(Boolean(event.typing));
      }
    });
    setSocket(s);
    return () => {
      s.emit('chat:leave', { chatId });
      s.disconnect();
    };
  }, [chatId, user?.id, token]);

  const canSendMessage = useMemo(
    () => !!chatId && !uploading && (text.trim().length > 0 || attachments.length > 0),
    [chatId, uploading, text, attachments.length],
  );

  const pickImages = async () => {
    if (!chatId) return;
    const remain = 4 - attachments.length;
    if (remain <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      console.warn('[OrderChat] media library permission denied', perm);
      return;
    }
    console.log('[OrderChat] pick images start', { remain });
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remain,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.length) {
      console.log('[OrderChat] pick canceled/no assets');
      return;
    }
    console.log('[OrderChat] picked assets', {
      count: result.assets.length,
      assets: result.assets.map((a) => ({ uri: a.uri, type: a.mimeType, name: a.fileName })),
    });

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        result.assets.slice(0, remain).map((asset, idx) =>
          uploadOrderChatAttachment(chatId, {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `chat-${Date.now()}-${idx}.jpg`,
          }),
        ),
      );
      console.log('[OrderChat] upload success', uploaded);
      setAttachments((prev) => [...prev, ...uploaded].slice(0, 4));
    } catch (e) {
      if (e && typeof e === 'object') {
        const maybeAxios = e as {
          message?: string;
          code?: string;
          response?: { status?: number; data?: unknown };
          config?: { baseURL?: string; url?: string; method?: string; timeout?: number };
        };
        console.error('[OrderChat] upload failed', {
          message: maybeAxios.message,
          code: maybeAxios.code,
          status: maybeAxios.response?.status,
          responseData: maybeAxios.response?.data,
          request: {
            baseURL: maybeAxios.config?.baseURL,
            url: maybeAxios.config?.url,
            method: maybeAxios.config?.method,
            timeout: maybeAxios.config?.timeout,
          },
        });
      } else {
        console.error('[OrderChat] upload failed', e);
      }
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!chatId || !canSendMessage) return;
    try {
      console.log('[OrderChat] sending message', {
        chatId,
        text: text.trim(),
        attachmentIds: attachments.map((a) => a.id),
      });
      const created = await sendOrderChatMessage(chatId, {
        text: text.trim() || undefined,
        attachmentIds: attachments.map((a) => a.id),
      });
      console.log('[OrderChat] sent message', { messageId: created.id });
      setMessages((prev) => appendUniqueMessage(prev, created));
      setText('');
      setAttachments([]);
    } catch (e) {
      console.error('[OrderChat] send failed', e);
    }
  };

  useEffect(() => {
    if (!socket || !chatId) return;
    if (!text.trim()) {
      socket.emit('chat:typing', { chatId, typing: false });
      return;
    }
    socket.emit('chat:typing', { chatId, typing: true });
    const timer = setTimeout(() => {
      socket.emit('chat:typing', { chatId, typing: false });
    }, 1500);
    return () => clearTimeout(timer);
  }, [text, socket, chatId]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messagesContent}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceToBottom =
            contentSize.height - (contentOffset.y + layoutMeasurement.height);
          shouldAutoScrollRef.current = distanceToBottom < 80;
        }}
        scrollEventThrottle={16}
      >
        {messages.map((m) => {
          const isMine = m.authorType === 'USER';
          const worker = m.authorWorker;
          const workerName = worker
            ? `${worker.firstName} ${worker.lastName}`.trim()
            : t('chat.workerProfileTitle');
          const workerAvatarUri = worker?.avatarUrl
            ? resolveFileUrl(worker.avatarUrl) || worker.avatarUrl
            : null;

          return (
            <View
              key={m.id}
              style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}
            >
              {!isMine && worker ? (
                <Pressable
                  onPress={() => setWorkerProfile(worker)}
                  style={styles.workerAvatarBtn}
                  accessibilityLabel={workerName}
                >
                  {workerAvatarUri ? (
                    <Image source={{ uri: workerAvatarUri }} style={styles.workerAvatar} />
                  ) : (
                    <View style={styles.workerAvatarPlaceholder}>
                      <Text style={styles.workerAvatarInitial}>
                        {workerName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
              <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
                {m.text ? (
                  <Text style={isMine ? styles.myText : styles.otherText}>{m.text}</Text>
                ) : null}
                {!!m.attachments?.length && (
                  <View
                    style={[
                      styles.imagesGrid,
                      isMine ? styles.imagesGridMine : styles.imagesGridTheirs,
                    ]}
                  >
                    {m.attachments.slice(0, 4).map((a) => {
                      const uri = resolveFileUrl(a.url) || a.url;
                      return (
                        <Pressable key={a.id} onPress={() => setPreviewImageUrl(uri)}>
                          <Image
                            source={{ uri }}
                            style={[styles.chatImage, { width: attachmentThumbWidth }]}
                            resizeMode="cover"
                            onError={() => {
                              console.error('[OrderChat] chat image failed', {
                                attachmentId: a.id,
                                url: uri,
                              });
                            }}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {isRemoteTyping ? (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>{t('chat.typing')}</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => void pickImages()}
          style={[styles.attachBtn, (!chatId || uploading) && styles.disabled]}
          disabled={!chatId || uploading}
        >
          <Text style={styles.attachText}>📷</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder={t('chat.message')}
        />
        <Pressable onPress={() => void send()} disabled={!canSendMessage} style={[styles.sendBtn, !canSendMessage && styles.disabled]}>
          <Text style={styles.sendText}>{t('chat.send')}</Text>
        </Pressable>
      </View>
      <View style={styles.attachmentsRow}>
        <Text style={styles.attachmentsText}>
          {uploading ? t('chat.uploading') : `${t('chat.attachments')}: ${attachments.length}/4`}
        </Text>
      </View>

      <WorkerPublicProfileModal
        worker={workerProfile}
        visible={Boolean(workerProfile)}
        onClose={() => setWorkerProfile(null)}
      />

      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImageUrl(null)}>
          <Pressable style={styles.previewCard} onPress={() => {}}>
            {previewImageUrl ? (
              <View style={styles.previewFrame}>
                <Image
                  source={{ uri: resolveFileUrl(previewImageUrl) || previewImageUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onError={() => {
                    console.error('[OrderChat] preview image failed', { url: previewImageUrl });
                  }}
                />
                <Pressable
                  style={styles.downloadBtn}
                  onPress={() => {
                    if (!previewImageUrl) return;
                    void Linking.openURL(previewImageUrl);
                  }}
                >
                  <Text style={styles.downloadBtnText}>{t('chat.download')}</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  messagesContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    maxWidth: '100%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  workerAvatarBtn: {
    marginBottom: 2,
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.beige,
  },
  workerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.beige,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarInitial: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.coffeeDark,
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.coffeeDark },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myText: { color: Colors.textInverse, fontSize: Typography.base },
  otherText: { color: Colors.textPrimary, fontSize: Typography.base },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attachText: { fontSize: 18 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.beige,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.coffeeDark,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: Colors.textInverse, fontWeight: '700', fontSize: Typography.sm },
  disabled: { opacity: 0.5 },
  attachmentsRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  attachmentsText: { fontSize: Typography.xs, color: Colors.textMuted },
  typingRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs, backgroundColor: Colors.white },
  typingText: { color: Colors.textMuted, fontSize: Typography.xs, fontStyle: 'italic' },
  imagesGrid: {
    marginTop: Spacing.sm,
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  imagesGridMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  imagesGridTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  chatImage: {
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.beige,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  previewCard: { width: '100%', maxWidth: 420 },
  previewFrame: {
    width: '100%',
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewImage: { width: '100%', height: 420 },
  downloadBtn: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.coffeeDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  downloadBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: Typography.sm },
});
