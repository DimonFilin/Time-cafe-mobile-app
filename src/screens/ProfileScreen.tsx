import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { getMyAvatarSignedUrl, me, updateMe, uploadMyAvatar, type UpdateMeInput } from '@/api/auth';
import { clearPersistedSession } from '@/auth/session';
import { FullscreenImageModal } from '@/components/FullscreenImageModal';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { resolveFileUrl } from '@/utils/files';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const sessionUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [editVisible, setEditVisible] = useState(false);
  const [avatarFullscreenVisible, setAvatarFullscreenVisible] = useState(false);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: me,
    enabled: isAuthenticated,
    initialData: sessionUser ?? undefined,
    retry: false,
  });

  const user = meQuery.data;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (editVisible) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhone((user.phone ?? '') as string);
    setAvatar((user.avatar ?? '') as string);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setAvatarLoadFailed(false);
    setAvatarSignedUrl(null);

    if (!user?.avatar) return;

    (async () => {
      try {
        const res = await getMyAvatarSignedUrl();
        if (cancelled) return;
        setAvatarSignedUrl(res.url);
      } catch {
        // Fallback handled via resolveFileUrl / raw avatar value
        if (cancelled) return;
        setAvatarSignedUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.avatar]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['me'], updated);
      setEditVisible(false);
    },
  });

  const payload = useMemo<UpdateMeInput>(() => {
    const p: UpdateMeInput = {};
    if (firstName.trim()) p.firstName = firstName.trim();
    if (lastName.trim()) p.lastName = lastName.trim();
    if (phone.trim()) p.phone = phone.trim();
    if (avatar.trim()) p.avatar = avatar.trim();
    return p;
  }, [firstName, lastName, phone, avatar]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    const a = (v?: string | null) => (v ?? '').trim();
    return (
      a(firstName) !== a(user.firstName) ||
      a(lastName) !== a(user.lastName) ||
      a(phone) !== a(user.phone as any) ||
      a(avatar) !== a(user.avatar as any)
    );
  }, [user?.id, firstName, lastName, phone, avatar]);

  async function pickAndUploadAvatar() {
    if (!user?.id) return;
    setAvatarUploadError('Opening image picker…');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAvatarUploadError('Media library permission is required.');
      return;
    }
    setAvatarUploadError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      setAvatarUploadError(null);
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const fileName = (asset.fileName ?? `avatar-${user.id}-${Date.now()}.jpg`).replace(/\s+/g, '-');
    const mimeType = asset.mimeType ?? 'image/jpeg';

    try {
      setAvatarUploading(true);
      const updated = await uploadMyAvatar({ uri: asset.uri, mimeType, fileName });
      setUser(updated);
      queryClient.setQueryData(['me'], updated);
      setAvatar(String(updated.avatar ?? ''));
    } catch (e) {
      setAvatarUploadError(getErrorMessage(e));
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('auth.profile.title')}</Text>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              if (!user) return;
              setAvatarUploadError(null);
              setFirstName(user.firstName ?? '');
              setLastName(user.lastName ?? '');
              setPhone((user.phone ?? '') as string);
              setAvatar((user.avatar ?? '') as string);
              setEditVisible(true);
            }}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={18} color="#111" />
          </Pressable>

          <Pressable
            onPress={() => meQuery.refetch()}
            disabled={meQuery.isFetching}
            style={({ pressed }) => [
              styles.headerIcon,
              meQuery.isFetching && styles.disabled,
              pressed && !meQuery.isFetching && styles.pressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color="#111" />
          </Pressable>

          <Pressable
            onPress={() => {
              logout();
              queryClient.clear();
              void clearPersistedSession();
            }}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color="#b00020" />
          </Pressable>
        </View>
      </View>

      <View style={styles.avatarRow}>
        <Pressable
          disabled={!user?.avatar}
          onPress={() => setAvatarFullscreenVisible(true)}
          style={({ pressed }) => [styles.avatarPressable, pressed && !!user?.avatar && styles.pressed]}
        >
          {user?.avatar ? (
            avatarLoadFailed ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {String(user?.firstName?.[0] ?? 'U').toUpperCase()}
                </Text>
              </View>
            ) : (
              <Image
                source={{
                  uri:
                    avatarSignedUrl ??
                    resolveFileUrl(String(user.avatar)) ??
                    String(user.avatar),
                }}
                style={styles.avatarImg}
                onError={() => setAvatarLoadFailed(true)}
              />
            )
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {String(user?.firstName?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.avatarMeta}>
          <Text style={styles.avatarName} numberOfLines={1}>
            {(user?.firstName ?? '—')} {(user?.lastName ?? '')}
          </Text>
          <Text style={styles.avatarSub} numberOfLines={1}>
            {user?.email ?? '—'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.row}>
          <Text style={styles.k}>id</Text>: {user?.id ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>email</Text>: {user?.email ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>name</Text>: {(user?.firstName ?? '—')} {(user?.lastName ?? '')}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>phone</Text>: {(user?.phone as any) ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>balance</Text>: {user?.balance ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>role</Text>: {user?.role ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>createdAt</Text>: {user?.createdAt ?? '—'}
        </Text>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Cards')}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryBtnText}>Cards</Text>
      </Pressable>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard} pointerEvents="auto">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
              >
                <Ionicons name="close-outline" size={18} color="#111" />
              </Pressable>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput value={user?.email ?? ''} editable={false} style={[styles.input, styles.inputDisabled]} />
            <Text style={styles.hint}>Email is read-only.</Text>

            <Text style={[styles.label, { marginTop: 10 }]}>First name</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />

            <Text style={[styles.label, { marginTop: 10 }]}>Last name</Text>
            <TextInput value={lastName} onChangeText={setLastName} style={styles.input} />

            <Text style={[styles.label, { marginTop: 10 }]}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} />

            <Text style={[styles.label, { marginTop: 10 }]}>Avatar</Text>
            <TextInput value={avatar} onChangeText={setAvatar} autoCapitalize="none" style={styles.input} />
            <Pressable
              disabled={avatarUploading}
              onPress={() => void pickAndUploadAvatar()}
              style={({ pressed }) => [
                styles.secondaryBtn,
                styles.secondaryBtnCompact,
                avatarUploading && styles.disabled,
                pressed && !avatarUploading && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>{avatarUploading ? 'Uploading…' : 'Upload avatar'}</Text>
            </Pressable>
            {avatarUploadError ? <Text style={styles.error}>{avatarUploadError}</Text> : null}

            {updateMutation.error ? <Text style={styles.error}>{getErrorMessage(updateMutation.error)}</Text> : null}

            <Pressable
              disabled={!isDirty || updateMutation.isPending || avatarUploading}
              onPress={() => updateMutation.mutate(payload)}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!isDirty || updateMutation.isPending || avatarUploading) && styles.disabled,
                pressed && !updateMutation.isPending && !avatarUploading && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {user?.avatar ? (
        <FullscreenImageModal
          visible={avatarFullscreenVisible}
          uri={
            avatarSignedUrl ??
            resolveFileUrl(String(user.avatar)) ??
            String(user.avatar)
          }
          onClose={() => setAvatarFullscreenVisible(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarPressable: { borderRadius: 999, overflow: 'hidden' },
  avatarImg: { width: 64, height: 64, borderRadius: 999, backgroundColor: '#eee' },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  avatarMeta: { flex: 1 },
  avatarName: { fontSize: 16, fontWeight: '700' },
  avatarSub: { fontSize: 12, opacity: 0.65, marginTop: 2 },
  card: { width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5', marginBottom: 12 },
  row: { fontSize: 13, marginBottom: 6 },
  k: { fontWeight: '700' },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  hint: { fontSize: 12, opacity: 0.6, marginTop: 6 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    opacity: 0.7,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryBtnCompact: {
    height: 40,
    marginBottom: 0,
    marginTop: 10,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#111' },
  error: { color: '#b00020', marginTop: 10 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 0,
    elevation: 0,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 12,
    zIndex: 2,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
});

