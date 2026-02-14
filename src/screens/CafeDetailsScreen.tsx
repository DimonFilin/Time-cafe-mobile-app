import type { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getCafeById, getCafePhotoUrls } from '@/api/cafes';
import { getBrandBannerSignedUrl, getBrandById, getBrandLogoSignedUrl } from '@/api/brands';
import { getReviews } from '@/api/reviews';
import { StarRating } from '@/components/StarRating';
import { t } from '@/i18n';
import { navigate } from '@/navigation/navigationRef';
import type { CafesStackParamList } from '@/navigation/stacks';
import { getStableColorFromId } from '@/utils/colors';
import { formatDateTime } from '@/utils/dates';
import { resolveFileUrl } from '@/utils/files';

type Props = StackScreenProps<CafesStackParamList, 'CafeDetails'>;

export function CafeDetailsScreen({ route }: Props) {
  const { id } = route.params;
  const [showRaw, setShowRaw] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  const cafeQuery = useQuery({
    queryKey: ['cafe', id],
    queryFn: () => getCafeById(id),
    retry: false,
  });

  const cafe = cafeQuery.data;

  const ratingText = useMemo(() => {
    if (typeof cafe?.rating !== 'number') return '—';
    return cafe.rating.toFixed(1);
  }, [cafe?.rating]);

  const brandId = cafe?.brandId;
  const cafeColor = useMemo(
    () => getStableColorFromId(String(brandId || cafe?.id || id)),
    [brandId, cafe?.id, id]
  );

  const brandQuery = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrandById(String(brandId)),
    enabled: !!brandId,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  const logoUrlQuery = useQuery({
    queryKey: ['brand', brandId, 'logo-url'],
    queryFn: () => getBrandLogoSignedUrl(String(brandId)),
    enabled: !!brandId,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  const bannerUrlQuery = useQuery({
    queryKey: ['brand', brandId, 'banner-url'],
    queryFn: () => getBrandBannerSignedUrl(String(brandId)),
    enabled: !!brandId,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  });

  const photosQuery = useQuery({
    queryKey: ['cafe', id, 'photo-urls'],
    queryFn: () => getCafePhotoUrls(id),
    enabled: !!cafe?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const reviewsPreviewQuery = useQuery({
    queryKey: ['reviews', { cafeId: id, limit: 3 }],
    queryFn: () => getReviews({ cafeId: id, page: 1, limit: 3 }),
    enabled: !!cafe?.id,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrlQuery.data?.url]);

  useEffect(() => {
    setBannerFailed(false);
  }, [bannerUrlQuery.data?.url]);

  useEffect(() => {
    setPhotosLoaded(false);
  }, [id, photosQuery.data?.urls?.length]);

  const theme = useMemo(() => {
    const b = brandQuery.data;
    return {
      // Keep primary color consistent with list stripe.
      primary: cafeColor,
      accent: b?.accentColor || cafeColor,
      bg: b?.backgroundColor || '#fff',
      text: b?.textColor || '#111',
      muted: '#6B7280',
      border: '#E5E7EB',
      card: '#F5F5F5',
    };
  }, [brandQuery.data?.id, cafeColor]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      {bannerUrlQuery.data?.url && !bannerFailed ? (
        <View style={styles.bannerWrap}>
          <Image
            source={{ uri: resolveFileUrl(bannerUrlQuery.data.url) ?? bannerUrlQuery.data.url }}
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
            {logoUrlQuery.data?.url && !logoFailed ? (
              <Image
                source={{ uri: resolveFileUrl(logoUrlQuery.data.url) ?? logoUrlQuery.data.url }}
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
            <Text style={[styles.title, { color: theme.text }]}>{cafe?.name ?? t('cafes.detailsTitle')}</Text>
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
        {cafe?.description ? <Text style={[styles.desc, { color: theme.muted }]}>{cafe.description}</Text> : null}

        {brandQuery.data ? (
          <View style={[styles.brandCard, { borderColor: theme.border }]}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>{brandQuery.data.name}</Text>
            {brandQuery.data.description ? (
              <Text style={[styles.brandDesc, { color: theme.muted }]} numberOfLines={3}>
                {brandQuery.data.description}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.reviewsCard, { borderColor: theme.border }]}>
          <View style={styles.reviewsHeader}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>{t('cafes.reviews.title')}</Text>
            <Pressable
              onPress={() => navigate('CafeReviews', { cafeId: cafe?.id ?? id, cafeName: cafe?.name })}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.linkBtnText, { color: theme.accent }]}>{t('cafes.reviews.open')}</Text>
            </Pressable>
          </View>

          {reviewsPreviewQuery.data?.items?.length ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              {reviewsPreviewQuery.data.items.slice(0, 3).map((r) => (
                <View key={r.id} style={[styles.reviewItem, { borderColor: theme.border }]}>
                  <View style={styles.reviewTopRow}>
                    <Text style={[styles.reviewUser, { color: theme.text }]} numberOfLines={1}>
                      {r.userName || 'User'}
                    </Text>
                    <Text style={[styles.reviewDate, { color: theme.muted }]}>{formatDateTime(r.createdAt, 'PP')}</Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    <StarRating value={r.rating} />
                    {r.isVerified ? <Text style={styles.verified}>Verified</Text> : null}
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
            onPress={() => navigate('ReviewCreate', { cafeId: cafe?.id ?? id, cafeName: cafe?.name })}
            style={({ pressed }) => [styles.secondaryAction, { borderColor: theme.border }, pressed && styles.pressed]}
          >
            <Text style={[styles.secondaryActionText, { color: theme.text }]}>{t('cafes.reviews.write')}</Text>
          </Pressable>
        </View>

        {photosQuery.data?.urls?.length ? (
          <>
            {/* Preload a few images invisibly, show strip only if at least one loads */}
            {!photosLoaded ? (
              <View style={styles.hiddenPreload}>
                {photosQuery.data.urls.slice(0, 3).map((u) => (
                  <Image
                    key={`pre-${u}`}
                    source={{ uri: resolveFileUrl(u) ?? u }}
                    style={styles.hiddenPreloadImg}
                    onLoad={() => setPhotosLoaded(true)}
                    onError={() => {}}
                  />
                ))}
              </View>
            ) : null}

            {photosLoaded ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {photosQuery.data.urls.slice(0, 12).map((u) => (
                  <Image
                    key={u}
                    source={{ uri: resolveFileUrl(u) ?? u }}
                    style={[styles.photo, { borderColor: theme.border }]}
                  />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}
      </View>

      {cafeQuery.isLoading ? <Text>Loading...</Text> : null}

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
            <Text style={styles.primaryBtnText}>Book</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowRaw((v) => !v)}
            style={({ pressed }) => [styles.rawButton, pressed && styles.pressed]}
          >
            <Text style={styles.rawButtonText}>{t('cafes.details.raw')}</Text>
          </Pressable>

          {showRaw ? (
            <View style={styles.rawCard}>
              <Text style={styles.mono}>{JSON.stringify(cafe, null, 2)}</Text>
            </View>
          ) : null}

          {cafe?.createdAt ? (
            <Text style={[styles.meta, { color: theme.muted }]}>
              Created: {formatDateTime(String(cafe.createdAt), 'PPpp')}
            </Text>
          ) : null}
        </>
      ) : null}
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
  reviewComment: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  secondaryAction: { marginTop: 10, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
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
  rawButton: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 12,
  },
  rawButtonText: { fontSize: 13, fontWeight: '600' },
  rawCard: { padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5', marginTop: 12 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  meta: { marginTop: 12, fontSize: 12, opacity: 0.8 },
  pressed: { opacity: 0.85 },
});

