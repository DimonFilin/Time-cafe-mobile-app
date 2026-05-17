import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { register, type RegisterInput } from '@/api/auth';
import { persistSession } from '@/auth/session';
import { t } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<RootStackParamList, 'Register'>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={Styles.label}>{label}</Text>
      {children}
    </View>
  );
}
const fieldStyles = StyleSheet.create({ wrap: { marginBottom: Spacing.md } });

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((s) => s.setSession);

  const { handleSubmit, setValue, watch } = useForm<RegisterInput>({
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (res) => {
      setSession({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken });
      await persistSession({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    },
  });

  const values = watch();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>{'Создайте аккаунт TimeCafe'}</Text>
          </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Field label={t('auth.register.firstName')}>
                <TextInput
                  value={values.firstName}
                  onChangeText={(v) => setValue('firstName', v)}
                  style={Styles.input}
                  placeholderTextColor={Colors.textMuted}
                />
              </Field>
            </View>
            <View style={styles.nameField}>
              <Field label={t('auth.register.lastName')}>
                <TextInput
                  value={values.lastName}
                  onChangeText={(v) => setValue('lastName', v)}
                  style={Styles.input}
                  placeholderTextColor={Colors.textMuted}
                />
              </Field>
            </View>
          </View>

          <Field label={t('auth.register.phone')}>
            <TextInput
              keyboardType="phone-pad"
              value={values.phone || ''}
              onChangeText={(v) => setValue('phone', v)}
              placeholder="+375-29-000-00-00"
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          <Field label={t('auth.register.email')}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={values.email}
              onChangeText={(v) => setValue('email', v)}
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          <Field label={t('auth.register.password')}>
            <TextInput
              secureTextEntry
              value={values.password}
              onChangeText={(v) => setValue('password', v)}
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />
          </Field>

          {mutation.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{getErrorMessage(mutation.error)}</Text>
            </View>
          ) : null}

          <Pressable
            disabled={mutation.isPending}
            onPress={handleSubmit((data) =>
              mutation.mutate({ ...data, phone: data.phone?.trim() ? data.phone : undefined })
            )}
            style={({ pressed }) => [
              Styles.primaryBtn,
              styles.submitBtn,
              mutation.isPending && Styles.disabled,
              pressed && !mutation.isPending && Styles.pressed,
            ]}
          >
            <Text style={Styles.primaryBtnText}>
              {mutation.isPending ? '...' : t('auth.register.submit')}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkText}>{t('auth.register.goToLogin')}</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxl, justifyContent: 'center' },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  form: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  nameField: { flex: 1 },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: Typography.sm },
  submitBtn: { marginTop: Spacing.xs },
  linkButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  linkText: {
    color: Colors.coffee,
    fontSize: Typography.base,
    fontWeight: '500',
  },
});
