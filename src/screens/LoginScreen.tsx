import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Animated, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from 'react-native';

import { login, type LoginInput } from '@/api/auth';
import { persistSession } from '@/auth/session';
import { t } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const setSession = useAuthStore((s) => s.setSession);

  const { handleSubmit, setValue, watch } = useForm<LoginInput>({
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: login,
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
        keyboardVerticalOffset={0}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={styles.logoArea}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
            <Text style={styles.appTitle}>TimeCafe</Text>
            <Text style={styles.appSubtitle}>{t('auth.login.title')}</Text>
          </Animated.View>

          <Animated.View style={styles.form}>
            <Text style={Styles.label}>{t('auth.login.email')}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={values.email}
              onChangeText={(v) => setValue('email', v)}
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={[Styles.label, { marginTop: Spacing.md }]}>{t('auth.login.password')}</Text>
            <TextInput
              secureTextEntry
              value={values.password}
              onChangeText={(v) => setValue('password', v)}
              style={Styles.input}
              placeholderTextColor={Colors.textMuted}
            />

            {mutation.error ? <Text style={styles.error}>{getErrorMessage(mutation.error)}</Text> : null}

            <Pressable
              disabled={mutation.isPending}
              onPress={handleSubmit((data) => mutation.mutate(data))}
              style={({ pressed }) => [
                Styles.primaryBtn,
                styles.submitBtn,
                mutation.isPending && Styles.disabled,
                pressed && !mutation.isPending && Styles.pressed,
              ]}
            >
              <Text style={Styles.primaryBtnText}>{t('auth.login.submit')}</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
              <Text style={styles.linkText}>{t('auth.login.goToRegister')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
  },
  appTitle: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  submitBtn: { marginTop: Spacing.lg },
  error: {
    color: Colors.error,
    fontSize: Typography.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  linkButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  linkText: {
    color: Colors.coffee,
    fontSize: Typography.base,
    fontWeight: '500',
  },
});

