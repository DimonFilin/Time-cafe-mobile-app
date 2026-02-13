import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { register, type RegisterInput } from '@/api/auth';
import { persistSession } from '@/auth/session';
import { t } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/utils/errors';

type Props = StackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const setSession = useAuthStore((s) => s.setSession);

  const { handleSubmit, setValue, watch } = useForm<RegisterInput>({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
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
    <View style={styles.container}>
      <Text style={styles.label}>{t('auth.register.firstName')}</Text>
      <TextInput value={values.firstName} onChangeText={(v) => setValue('firstName', v)} style={styles.input} />

      <Text style={styles.label}>{t('auth.register.lastName')}</Text>
      <TextInput value={values.lastName} onChangeText={(v) => setValue('lastName', v)} style={styles.input} />

      <Text style={styles.label}>{t('auth.register.phone')}</Text>
      <TextInput
        keyboardType="phone-pad"
        value={values.phone || ''}
        onChangeText={(v) => setValue('phone', v)}
        style={styles.input}
      />

      <Text style={styles.label}>{t('auth.register.email')}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={values.email}
        onChangeText={(v) => setValue('email', v)}
        style={styles.input}
      />

      <Text style={styles.label}>{t('auth.register.password')}</Text>
      <TextInput
        secureTextEntry
        value={values.password}
        onChangeText={(v) => setValue('password', v)}
        style={styles.input}
      />

      {mutation.error ? <Text style={styles.error}>{getErrorMessage(mutation.error)}</Text> : null}

      <Pressable
        disabled={mutation.isPending}
        onPress={handleSubmit((data) =>
          mutation.mutate({
            ...data,
            phone: data.phone?.trim() ? data.phone : undefined,
          })
        )}
        style={({ pressed }) => [
          styles.primaryButton,
          mutation.isPending && styles.disabled,
          pressed && !mutation.isPending && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>{t('auth.register.submit')}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
        <Text style={styles.linkText}>{t('auth.register.goToLogin')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  error: { color: '#b00020', marginBottom: 12 },
  primaryButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  linkButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: '#111', fontSize: 14, textDecorationLine: 'underline' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});

