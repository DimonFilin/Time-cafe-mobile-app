import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createReview } from '@/api/reviews';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';
import { getErrorMessage } from '@/utils/errors';

type Props = StackScreenProps<CafesStackParamList, 'ReviewCreate'>;

export function ReviewCreateScreen({ navigation, route }: Props) {
  const { cafeId, cafeName } = route.params;
  const queryClient = useQueryClient();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');

  const canSubmit = useMemo(() => rating > 0, [rating]);

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      navigation.goBack();
    },
  });

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      cafeId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{cafeName ? `${t('cafes.reviews.write')} • ${cafeName}` : t('cafes.reviews.write')}</Text>

      <Text style={styles.label}>Rating</Text>
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => {
          const v = i + 1;
          const active = v <= rating;
          return (
            <Pressable key={v} onPress={() => setRating(v)} style={({ pressed }) => [styles.starBtn, pressed && styles.pressed]}>
              <Ionicons name={active ? 'star' : 'star-outline'} size={28} color={active ? '#F59E0B' : '#9CA3AF'} />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t('cafes.reviews.comment')}</Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="..."
        multiline
        style={styles.input}
        maxLength={2000}
      />

      {mutation.error ? <Text style={styles.error}>{getErrorMessage(mutation.error)}</Text> : null}

      <Pressable
        disabled={!canSubmit || mutation.isPending}
        onPress={submit}
        style={({ pressed }) => [
          styles.primaryBtn,
          (!canSubmit || mutation.isPending) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryBtnText}>{mutation.isPending ? 'Submitting...' : t('cafes.reviews.submit')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  label: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  starBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  primaryBtn: { height: 44, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  error: { color: '#b00020', marginBottom: 10 },
});

