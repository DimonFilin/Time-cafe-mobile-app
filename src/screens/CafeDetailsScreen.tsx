import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { getCafeById } from '@/api/cafes';
import { getCafeOccupancy } from '@/api/cafe-layout';
import { getReviews } from '@/api/reviews';
import { StarRating } from '@/components/StarRating';
import { t } from '@/i18n';
import { navigate } from '@/navigation/navigationRef';
import type { CafesStackParamList } from '@/navigation/stacks';
import { formatDateTime } from '@/utils/dates';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

type Props = StackScreenProps<CafesStackParamList, 'CafeDetails'>;

export function CafeDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [logoFailed, setLogoFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const DAY_LABELS: Record<string, string> = {
    monday: 'Понедельник', tuesday: 'Вторник', wednesday: 'Среда',
    thursday: 'Четверг', friday: 'Пятница', saturday: 'Суббота', sunday: 'Воскресенье',
  };
  const todayKey = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const cafeQuery = useQuery({
    queryKey: ['cafe', id],
    queryFn: () => getCafeById(id),
    retry: false,
  });

  const cafe = cafeQuery.data;
  const todayYmd = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const occupancyQuery = useQuery({
    queryKey: ['cafe-occupancy', id, todayYmd],
    queryFn: () => getCafeOccupancy(id, todayYmd),
    enabled: !!id,
    retry: false,
  });

  const ratingText = useMemo(() => {
    if (typeof cafe?.rating !== 'number') return '—';
    return cafe.rating.toFixed(1);
  }, [cafe?.rating]);

  const reviewsPreviewQuery = useQuery({
    queryKey: ['reviews', { cafeId: id, limit: 3 }],
    queryFn: () => getReviews({ cafeId: id, page: 1, limit: 3 }),
    enabled: !!cafe?.id,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const logoUrl = cafe?.presentation.assets.logoUrl;
  const bannerUrl = cafe?.presentation.assets.bannerUrl;
  const photoUrls = cafe?.presentation.assets.photoUrls || [];
  const weeklySchedule = cafe?.openingHours;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    setBannerFailed(false);
  }, [bannerUrl]);

  useEffect(() => {
    setPhotosLoaded(false);
  }, [id, photoUrls.length]);

  const theme = useMemo(() => {
    const presentationTheme = cafe?.presentation.theme;
    return {
      primary: presentationTheme?.primary || '#111',
      accent: presentationTheme?.accent || presentationTheme?.primary || '#111',
      bg: presentationTheme?.background || '#fff',
      text: presentationTheme?.text || '#111',
      muted: '#6B7280',
      border: '#E5E7EB',
      card: '#F5F5F5',
      fontFamily: presentationTheme?.fontFamily,
    };
  }, [cafe?.presentation.theme]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {bannerUrl && !bannerFailed ? (
        <View style={styles.bannerWrap}>
          <Image
            source={{ uri: bannerUrl }}
            style={styles.bannerImg}
            onError={() => setBannerFailed(true)}
          />
          <View style={styles.bannerShade} />
        </View>
      ) : (
        <View style={[styles.bannerWrap, { backgroundColor: theme.primary }]} />
      )}

      <View style={styles.body}>
      <View style={styles.headerCard}>
        <View style={styles.logoRow}>
          <View style={[styles.logoCircle, { borderColor: theme.bg }]}>
            {logoUrl && !logoFailed ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.logoImg}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: theme.primary }]}>
                <Text style={styles.logoFallbackText}>
                  {String(cafe?.name?.[0] ?? 'C').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.titleCol}>
            <Text
              style={[
                styles.title,
                { color: theme.text },
                theme.fontFamily ? { fontFamily: theme.fontFamily } : null,
              ]}
            >
              {cafe?.name ?? t('cafes.detailsTitle')}
            </Text>
            <Text style={[styles.sub, { color: theme.muted }]}>
              {cafe?.city || '—'}
              {cafe?.regionName ? ` • ${cafe.regionName}` : ''}
            </Text>
            <View style={styles.ratingRow}>
              <StarRating value={Number(cafe?.rating ?? 0)} size={14} />
              <Text style={[styles.ratingText, { color: theme.muted }]}>
                {ratingText} ({typeof cafe?.reviewsCount === 'number' ? cafe.reviewsCount : '—'})
              </Text>
            </View>
          </View>
        </View>

        {cafe?.address ? <Text style={[styles.address, { color: theme.text }]}>{cafe.address}</Text> : null}

        <View style={[styles.infoCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          {cafe?.phone ? (
            <Pressable
              onPress={() => {
                if (
                  /^(\+375-\d{2}-\d{3}-\d{2}-\d{2}|\+7-\d{3}-\d{2}-\d{2}-\d{2})$/.test(
                    cafe.phone!,
                  )
                ) {
                  void Linking.openURL(`tel:${cafe.phone.replace(/-/g, '')}`);
                }
              }}
            >
              <Text style={[styles.infoLine, { color: theme.text }]}>Телефон: {cafe.phone}</Text>
            </Pressable>
          ) : null}
          {cafe?.email ? (
            <Text style={[styles.infoLine, { color: theme.text }]}>Email: {cafe.email}</Text>
          ) : null}
          {cafe?.isOpenNow != null ? (
            <Text style={[styles.infoLine, { color: theme.text }]}>
              Статус: {cafe.isOpenNow ? 'Открыто' : 'Закрыто'}
            </Text>
          ) : null}
          {occupancyQuery.data ? (
            <Text style={[styles.infoLine, { color: theme.text }]}>
              Загрузка:{' '}
              {occupancyQuery.data.displayValue ??
                (occupancyQuery.data.occupancyMode === 'COUNT'
                  ? `${occupancyQuery.data.totalAppointments} из ${occupancyQuery.data.totalCapacity || 0}`
                  : `${occupancyQuery.data.occupancyPercent}%`)}
            </Text>
          ) : null}
        </View>

        {cafe?.description ? <Text style={[styles.desc, { color: theme.muted }]}>{cafe.description}</Text> : null}

        {/* ── Schedule ── */}
        {cafe?.openingHours ? (() => {
          const today = cafe.openingHours[todayKey];
          const todayText = today?.closed ? 'Закрыто' : (today?.open && today?.close ? `${today.open} – ${today.close}` : null);
          return (
            <Pressable
              onPress={() => setScheduleModalVisible(true)}
              style={({ pressed }) => [styles.scheduleRow, pressed && styles.pressed]}
            >
              <Ionicons name="time-outline" size={14} color={theme.accent} />
              <Text style={[styles.scheduleText, { color: theme.accent }]}>
                {todayText ? `Сегодня: ${todayText}` : 'Расписание'}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={theme.muted} />
            </Pressable>
          );
        })() : null}

        {cafe?.brand ? (
          <View style={[styles.brandCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>{cafe.brand.name}</Text>
            {cafe.brand.description ? (
              <Text style={[styles.brandDesc, { color: theme.muted }]} numberOfLines={3}>
                {cafe.brand.description}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.reviewsCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.reviewsHeader}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>{t('cafes.reviews.title')}</Text>
            <Pressable
              onPress={() => navigation.navigate('CafeReviews', { cafeId: cafe?.id ?? id, cafeName: cafe?.name })}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.linkBtnText, { color: theme.accent }]}>{t('cafes.reviews.open')}</Text>
            </Pressable>
          </View>

          {reviewsPreviewQuery.data?.items?.length ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              {reviewsPreviewQuery.data.items.slice(0, 3).map((r) => (
                <View key={r.id} style={[styles.reviewItem, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                  <View style={styles.reviewTopRow}>
                    <Text style={[styles.reviewUser, { color: theme.text }]} numberOfLines={1}>
                      {r.userName || t('common.user')}
                    </Text>
                    <Text style={[styles.reviewDate, { color: theme.muted }]}>{formatDateTime(r.createdAt, 'PP')}</Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    <StarRating value={r.rating} />
                    {r.isVerified ? <Text style={styles.verified}>{t('common.verified')}</Text> : null}
                  </View>
                  {r.comment ? (
                    <Text style={[styles.reviewComment, { color: theme.muted }]} numberOfLines={3}>
                      {r.comment}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.brandDesc, { color: theme.muted, marginTop: 8 }]}>{t('cafes.reviews.empty')}</Text>
          )}

          <Pressable
            onPress={() =>
              navigation.navigate('ReviewCreate', { cafeId: cafe?.id ?? id, cafeName: cafe?.name })
            }
            style={({ pressed }) => [styles.secondaryAction, { borderColor: theme.border }, pressed && styles.pressed]}
          >
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>{t('cafes.reviews.write')}</Text>
          </Pressable>
        </View>
        {photoUrls.length ? (
          <>
            {/* Preload a few images invisibly, show strip only if at least one loads */}
            {!photosLoaded ? (
              <View style={styles.hiddenPreload}>
                {photoUrls.slice(0, 3).map((u) => (
                  <Image
                    key={`pre-${u}`}
                    source={{ uri: u }}
                    style={styles.hiddenPreloadImg}
                    onLoad={() => setPhotosLoaded(true)}
                    onError={() => {}}
                  />
                ))}
              </View>
            ) : null}

            {photosLoaded ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {photoUrls.slice(0, 12).map((u) => (
                  <Image
                    key={u}
                    source={{ uri: u }}
                    style={[styles.photo, { borderColor: theme.border }]}
                  />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}
      </View>

      {cafeQuery.isLoading ? <Text>{t('common.loading')}</Text> : null}

      {cafe ? (
        <>
          <Pressable
            onPress={() => navigate('BookingCreate', { cafeId: cafe.id, cafeName: cafe.name })}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{t('common.bookNow')}</Text>
          </Pressable>
        </>
      ) : null}

      <Modal
        visible={scheduleModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Время работы</Text>
            <View style={styles.scheduleList}>
              {DAY_KEYS.map((dayKey) => {
                const item = weeklySchedule?.[dayKey];
                const isClosed = item?.closed;
                const dayValue = isClosed
                  ? 'Закрыто'
                  : item?.open && item?.close
                    ? `${item.open} – ${item.close}`
                    : 'Не указано';
                return (
                  <View key={dayKey} style={styles.scheduleItemRow}>
                    <Text style={[styles.scheduleItemDay, { color: theme.text }]}>
                      {DAY_LABELS[dayKey]}
                    </Text>
                    <Text style={[styles.scheduleItemHours, { color: theme.muted }]}>
                      {dayValue}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Pressable
              onPress={() => setScheduleModalVisible(false)}
              style={({ pressed }) => [
                styles.modalCloseBtn,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16 },
  bannerWrap: { width: '100%', height: 160, backgroundColor: '#111' },
  bannerImg: { width: '100%', height: '100%' },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  body: { paddingHorizontal: 16 },
  headerCard: { marginTop: -26, paddingTop: 0 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: -18 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  logoFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  titleCol: { flex: 1, paddingTop: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 12, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ratingText: { fontSize: 12 },
  address: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  infoCard: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  infoLine: { fontSize: 13 },
  desc: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  brandCard: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  brandTitle: { fontSize: 13, fontWeight: '800' },
  brandDesc: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  reviewsCard: { marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  linkBtnText: { fontSize: 12, fontWeight: '800' },
  reviewItem: { borderWidth: 1, borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reviewUser: { fontSize: 12, fontWeight: '800', flex: 1 },
  reviewDate: { fontSize: 11 },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  verified: { fontSize: 11, fontWeight: '700', color: '#059669' },
  reviewComment: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  secondaryAction: { marginTop: 10, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  scheduleRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  scheduleText: { fontSize: 12, fontWeight: '700' },
  hiddenPreload: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  hiddenPreloadImg: { width: 1, height: 1 },
  photosRow: { paddingVertical: 12, gap: 10 },
  photo: { width: 140, height: 88, borderRadius: 14, borderWidth: 1, backgroundColor: 'transparent' },
  primaryBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  scheduleList: { gap: 6 },
  scheduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scheduleItemDay: { fontSize: 13, fontWeight: '600' },
  scheduleItemHours: { fontSize: 13, fontWeight: '500' },
  modalCloseBtn: {
    marginTop: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});

