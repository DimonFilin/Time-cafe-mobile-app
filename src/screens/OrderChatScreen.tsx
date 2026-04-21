import type { StackScreenProps } from '@react-navigation/stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

import type { BookingsStackParamList } from '@/navigation/stacks';
import {
  getOrderChatByOrder,
  getOrderChatMessages,
  OrderChatMessage,
  sendOrderChatMessage,
  uploadOrderChatAttachment,
} from '@/api/order-chat';
import { useAuthStore } from '@/store/authStore';

type Props = StackScreenProps<BookingsStackParamList, 'OrderChat'>;

const WS_URL = process.env.EXPO_PUBLIC_SHARED_API_URL || 'http://localhost:3000';

export function OrderChatScreen({ route }: Props) {
  const { orderId } = route.params;
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
    console.log('[OrderChat] connecting socket', { WS_URL, chatId, hasToken: Boolean(token) });
    const s = io(`${WS_URL}/order-chats`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      auth: token ? { token } : undefined,
      withCredentials: true,
    });
    s.emit('chat:join', { chatId });
    s.on('connect', () => console.log('[OrderChat] socket connected', { id: s.id }));
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        {messages.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.authorType === 'USER' ? styles.myBubble : styles.otherBubble]}
          >
            {m.text ? <Text style={m.authorType === 'USER' ? styles.myText : styles.otherText}>{m.text}</Text> : null}
            {!!m.attachments?.length && (
              <View style={styles.imagesGrid}>
                {m.attachments.slice(0, 4).map((a) => (
                  <Pressable key={a.id} onPress={() => setPreviewImageUrl(a.url)}>
                    <Image
                      source={{ uri: a.url }}
                      style={styles.chatImage}
                      onError={() => {
                        console.error('[OrderChat] chat image failed', { attachmentId: a.id, url: a.url });
                      }}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {isRemoteTyping ? (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>Сотрудник печатает...</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable onPress={() => void pickImages()} style={styles.attachBtn}>
          <Text style={styles.attachText}>📷</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder="Сообщение"
        />
        <Pressable onPress={() => void send()} disabled={!canSendMessage} style={[styles.sendBtn, !canSendMessage && styles.disabled]}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
      <View style={styles.attachmentsRow}>
        <Text style={styles.attachmentsText}>
          {uploading ? 'Загрузка фото...' : `Вложений: ${attachments.length}/4`}
        </Text>
      </View>

      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImageUrl(null)}>
          <Pressable style={styles.previewCard} onPress={() => {}}>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
                onError={() => {
                  console.error('[OrderChat] preview image failed', { url: previewImageUrl });
                }}
              />
            ) : null}
            <Pressable
              style={styles.downloadBtn}
              onPress={() => {
                if (!previewImageUrl) return;
                void Linking.openURL(previewImageUrl);
              }}
            >
              <Text style={styles.downloadBtnText}>Скачать</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messagesContent: { padding: 12, gap: 8 },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#16a34a' },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#f3f4f6' },
  myText: { color: '#fff' },
  otherText: { color: '#111827' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  attachBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  attachText: { fontSize: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  sendText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  attachmentsRow: { paddingHorizontal: 12, paddingBottom: 8 },
  attachmentsText: { fontSize: 12, color: '#6b7280' },
  typingRow: { paddingHorizontal: 14, paddingBottom: 6 },
  typingText: { color: '#6b7280', fontSize: 12, fontStyle: 'italic' },
  imagesGrid: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chatImage: { width: 82, height: 82, borderRadius: 8 },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    overflow: 'visible',
  },
  previewImage: {
    width: '100%',
    height: 420,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  downloadBtn: {
    position: 'absolute',
    right: 12,
    bottom: -14,
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
