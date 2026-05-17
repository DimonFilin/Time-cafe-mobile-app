import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { getMyAvatarSignedUrl, me, updateMe, uploadMyAvatar, type UpdateMeInput } from '@/api/auth';
import { clearPersistedSession } from '@/auth/session';
import { FullscreenImageModal } from '@/components/FullscreenImageModal';
import { MoneyAmount } from '@/components/currency/MoneyAmount';
import { t } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { resolveFileUrl } from '@/utils/files';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
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
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (editVisible) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhone((user.phone ?? '') as string);
    setGender((user.gender as 'MALE' | 'FEMALE' | null) ?? '');
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
    if (gender) p.gender = gender;
    return p;
  }, [firstName, lastName, phone, gender]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    const a = (v?: string | null) => (v ?? '').trim();
    return (
      a(firstName) !== a(user.firstName) ||
      a(lastName) !== a(user.lastName) ||
      a(phone) !== a(user.phone as any) ||
      (gender || '') !== ((user.gender as 'MALE' | 'FEMALE' | null) ?? '')
    );
  }, [user?.id, firstName, lastName, phone, gender]);

  function digitsOnly(v: string) {
    return v.replace(/\D+/g, '');
  }

  function formatByPhone(v: string) {
    const digits = digitsOnly(v);
    const tail = digits.startsWith('375') ? digits.slice(3) : digits;
    const d = tail.slice(0, 9);

    const parts: string[] = ['+375'];
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 7);
    const p4 = d.slice(7, 9);
    if (p1) parts.push(p1);
    if (p2) parts.push(p2);
    if (p3) parts.push(p3);
    if (p4) parts.push(p4);
    return parts.join('-');
  }

  const phoneFormatted = useMemo(() => formatByPhone(phone), [phone]);
  const phoneDigits = useMemo(() => digitsOnly(phoneFormatted), [phoneFormatted]);
  const phoneValid = useMemo(() => {
    const t = phone.trim();
    if (!t) return true;
    return phoneDigits.startsWith('375') && phoneDigits.length === 12;
  }, [phone, phoneDigits]);

  const nameTooLong = firstName.trim().length > 20 || lastName.trim().length > 20;
  const canSave = (isDirty || avatarChanged) && !avatarUploading && !updateMutation.isPending && phoneValid && !nameTooLong;

  function handleSave() {
    if (!canSave) return;
    if (isDirty) {
      updateMutation.mutate(payload);
      return;
    }
    // Avatar upload already updates profile on backend.
    setAvatarChanged(false);
    setEditVisible(false);
  }

  function getAvatarUri() {
    const raw = user?.avatar ? String(user.avatar) : '';
    const candidate = avatarSignedUrl ?? resolveFileUrl(raw) ?? raw;
    if (!/^https?:\/\//i.test(candidate)) return null;
    return candidate;
  }

  async function pickAndUploadAvatar() {
    if (!user?.id) return;
    setAvatarUploadError(t('profile.openingGallery'));

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAvatarUploadError(t('profile.galleryPermission'));
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
      setAvatarChanged(true);
    } catch (e) {
      setAvatarUploadError(getErrorMessage(e));
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
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
              setGender((user.gender as 'MALE' | 'FEMALE' | null) ?? '');
              setAvatarChanged(false);
              setEditVisible(true);
            }}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={18} color={Colors.coffeeDark} />
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
            <Ionicons name="refresh-outline" size={18} color={Colors.coffeeDark} />
          </Pressable>

          <Pressable
            onPress={() => {
              logout();
              queryClient.clear();
              void clearPersistedSession();
            }}
            style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      <View style={styles.avatarRow}>
        <Pressable
          disabled={!user?.avatar}
          onPress={() => setAvatarFullscreenVisible(true)}
          style={({ pressed }) => [styles.avatarPressable, pressed && !!user?.avatar && styles.pressed]}
        >
          {user?.avatar && getAvatarUri() ? (
            avatarLoadFailed ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {String(user?.firstName?.[0] ?? 'U').toUpperCase()}
                </Text>
              </View>
            ) : (
              <Image
                source={{
                  uri: getAvatarUri() as string,
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
          <Text style={styles.k}>{t('profile.email')}</Text>: {user?.email ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>{t('profile.name')}</Text>: {(user?.firstName ?? '—')} {(user?.lastName ?? '')}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>{t('profile.phone')}</Text>: {(user?.phone as any) ?? '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.k}>{t('profile.gender')}</Text>:{' '}
          {user?.gender === 'MALE'
            ? t('profile.male')
            : user?.gender === 'FEMALE'
              ? t('profile.female')
              : '—'}
        </Text>
        <View style={[styles.row, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }]}>
          <Text>
            <Text style={styles.k}>{t('profile.balance')}</Text>:
          </Text>
          {user?.balance != null ? (
            <MoneyAmount value={user.balance} textStyle={styles.rowValue} iconSize={14} />
          ) : (
            <Text style={styles.rowValue}>—</Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Cards')}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryBtnText}>{t('profile.cards')}</Text>
      </Pressable>

      
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryBtnText}>{t('profile.settings')}</Text>
      </Pressable>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCard} pointerEvents="auto">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}
              >
                <Ionicons name="close-outline" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.label, { marginTop: Spacing.sm }]}>{t('profile.name')}</Text>
              <TextInput value={firstName} onChangeText={setFirstName} maxLength={20} style={styles.input} />
              {firstName.trim().length > 20 ? <Text style={styles.error}>{t('profile.maxLength')}</Text> : null}

              <Text style={[styles.label, { marginTop: Spacing.md }]}>{t('profile.surname')}</Text>
              <TextInput value={lastName} onChangeText={setLastName} maxLength={20} style={styles.input} />
              {lastName.trim().length > 20 ? <Text style={styles.error}>{t('profile.maxLength')}</Text> : null}

              <Text style={[styles.label, { marginTop: Spacing.md }]}>{t('profile.phone')}</Text>
              <TextInput
                value={phoneFormatted}
                onChangeText={(v) => setPhone(formatByPhone(v))}
                keyboardType="phone-pad"
                autoCapitalize="none"
                placeholder="+375-29-333-33-33"
                style={styles.input}
              />
              {!phoneValid ? <Text style={styles.error}>{t('profile.phoneFormat')}</Text> : null}

              <Text style={[styles.label, { marginTop: Spacing.md }]}>{t('profile.gender')}</Text>
              <View style={styles.genderRow}>
                <Pressable
                  onPress={() => setGender('MALE')}
                  style={({ pressed }) => [
                    styles.genderChip,
                    gender === 'MALE' && styles.genderChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.genderChipText, gender === 'MALE' && styles.genderChipTextActive]}>
                    {t('profile.male')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setGender('FEMALE')}
                  style={({ pressed }) => [
                    styles.genderChip,
                    gender === 'FEMALE' && styles.genderChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.genderChipText, gender === 'FEMALE' && styles.genderChipTextActive]}>
                    {t('profile.female')}
                  </Text>
                </Pressable>
              </View>

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
                <Text style={styles.secondaryBtnText}>{avatarUploading ? t('profile.uploading') : t('profile.uploadAvatar')}</Text>
              </Pressable>
              {avatarUploadError ? <Text style={styles.error}>{avatarUploadError}</Text> : null}
              {avatarChanged ? <Text style={styles.hint}>{t('profile.avatarUpdated')}</Text> : null}

              {updateMutation.error ? <Text style={styles.error}>{getErrorMessage(updateMutation.error)}</Text> : null}

              <Pressable
                disabled={!canSave}
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canSave && styles.disabled,
                  pressed && !updateMutation.isPending && !avatarUploading && styles.pressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>{updateMutation.isPending ? t('profile.saving') : t('profile.save')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {user?.avatar ? (
        <FullscreenImageModal
          visible={avatarFullscreenVisible}
          uri={getAvatarUri() ?? ''}
          onClose={() => setAvatarFullscreenVisible(false)}
        />
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: { flex: 1, backgroundColor: Colors.white, padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerIcon: { ...Styles.headerIcon },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  avatarPressable: { borderRadius: Radius.full, overflow: 'hidden' },
  avatarImg: { width: 64, height: 64, borderRadius: Radius.full, backgroundColor: Colors.beige },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.coffeeDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: Colors.textInverse, fontWeight: '800', fontSize: 22 },
  avatarMeta: { flex: 1 },
  avatarName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  avatarSub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  card: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  row: { fontSize: Typography.sm, marginBottom: 6, color: Colors.textPrimary },
  rowValue: { fontSize: Typography.sm, fontFamily: 'monospace', color: Colors.textSecondary },
  k: { fontWeight: '700', color: Colors.coffeeDark },
  label: { ...Styles.label },
  hint: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: Spacing.sm },
  input: { ...Styles.input },
  inputDisabled: { opacity: 0.7 },
  primaryBtn: { ...Styles.primaryBtn, marginTop: Spacing.md },
  primaryBtnText: Styles.primaryBtnText,
  secondaryBtn: { ...Styles.secondaryBtn, marginBottom: Spacing.md },
  secondaryBtnCompact: { height: 40, marginBottom: 0, marginTop: Spacing.sm },
  secondaryBtnText: Styles.secondaryBtnText,
  error: { color: Colors.error, marginTop: Spacing.sm, fontSize: Typography.sm },
  pressed: Styles.pressed,
  disabled: Styles.disabled,
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 0,
    elevation: 0,
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingBottom: 0,
    zIndex: 2,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: Typography.lg, fontWeight: '800', color: Colors.textPrimary },
  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  genderChip: {
    flex: 1,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipActive: {
    borderColor: Colors.coffeeDark,
    backgroundColor: Colors.coffeeDark,
  },
  genderChipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: '600' },
  genderChipTextActive: { color: Colors.textInverse, fontWeight: '700' },
});

