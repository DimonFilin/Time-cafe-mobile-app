import type { StackScreenProps } from '@react-navigation/stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createReview, updateReview } from '@/api/reviews';
import { t } from '@/i18n';
import type { CafesStackParamList } from '@/navigation/stacks';
import { getErrorMessage } from '@/utils/errors';
import { Colors, Radius, Spacing, Styles, Typography } from '@/utils/theme';

type Props = StackScreenProps<CafesStackParamList, 'ReviewCreate'>;

export function ReviewCreateScreen({ navigation, route }: Props) {
  const { cafeId, cafeName, reviewId, initialRating, initialComment } = route.params;
  const isEditMode = Boolean(reviewId);
  const queryClient = useQueryClient();

  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [comment, setComment] = useState(initialComment ?? '');

  const canSubmit = useMemo(() => rating > 0, [rating]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (reviewId) {
        return updateReview(reviewId, {
          rating,
          comment: comment.trim() || undefined,
        });
      }
      return createReview({
        cafeId,
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      navigation.goBack();
    },
  });

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {cafeName ? (
        <View style={styles.cafeCard}>
          <Text style={styles.cafeName}>{cafeName}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={Styles.label}>{t('cafes.reviews.rating') ?? 'Оценка'}</Text>
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => {
            const v = i + 1;
            const active = v <= rating;
            return (
              <Pressable key={v} onPress={() => setRating(v)} style={({ pressed }) => [styles.starBtn, pressed && Styles.pressed]}>
                <Ionicons name={active ? 'star' : 'star-outline'} size={32} color={active ? Colors.warning : Colors.border} />
              </Pressable>
            );
          })}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {['', '😞 Плохо', '😐 Так себе', '🙂 Нормально', '😊 Хорошо', '🤩 Отлично'][rating]}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={Styles.label}>{t('cafes.reviews.comment')}</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Расскажите о своём визите..."
          multiline
          style={styles.input}
          maxLength={2000}
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.charCount}>{comment.length}/2000</Text>
      </View>

      {mutation.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{getErrorMessage(mutation.error)}</Text>
        </View>
      ) : null}

      <Pressable
        disabled={!canSubmit || mutation.isPending}
        onPress={submit}
        style={({ pressed }) => [
          Styles.primaryBtn,
          (!canSubmit || mutation.isPending) && Styles.disabled,
          pressed && canSubmit && Styles.pressed,
        ]}
      >
        <Text style={Styles.primaryBtnText}>
          {mutation.isPending
            ? t('common.loading')
            : isEditMode
              ? 'Сохранить изменения'
              : t('cafes.reviews.submit')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  cafeCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.coffeeDark,
    padding: Spacing.md,
  },
  cafeName: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  starsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  starBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { fontSize: Typography.base, color: Colors.textSecondary, fontWeight: '500', marginTop: Spacing.xs },
  input: {
    minHeight: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
    backgroundColor: Colors.beige,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  charCount: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'right', marginTop: Spacing.xs },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.sm },
});

