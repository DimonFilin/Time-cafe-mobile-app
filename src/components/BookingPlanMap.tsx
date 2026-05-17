import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { PlanPreview } from '@/api/cafe-layout';
import { AnimatedPlanLayer } from '@/components/plan-map/AnimatedPlanLayer';
import { computeFitLayout, type FitLayout } from '@/components/plan-map/plan-map-coords';
import { pointInPolygon, screenToPlanFromRaster } from '@/components/plan-map/plan-map-hit';
import { PX_PER_M } from '@/components/plan-map/plan-map-shapes';
import { logBooking, planPreviewStats } from '@/utils/booking-debug';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

const MAX_ZOOM = 5;

type Props = {
  planPreview?: PlanPreview | null;
  selectedRoomId: string | null;
  onSelectRoom?: (roomId: string) => void;
  height?: number;
  interactive?: boolean;
  highlightOnlySelected?: boolean;
};

function hasVectorPlan(plan: PlanPreview) {
  return (
    (plan.walls?.length ?? 0) > 0 ||
    (plan.furniture?.length ?? 0) > 0 ||
    (plan.openings?.length ?? 0) > 0
  );
}

const RasterFallback = memo(function RasterFallback({
  uri,
  layout,
  panPx,
  panPy,
  zoom,
  cacheKey,
}: {
  uri: string;
  layout: FitLayout;
  panPx: Animated.Value;
  panPy: Animated.Value;
  zoom: number;
  cacheKey: string;
}) {
  const w = Math.round(layout.displayW * zoom);
  const h = Math.round(layout.displayH * zoom);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: layout.originX,
        top: layout.originY,
        width: w,
        height: h,
        transform: [{ translateX: panPx }, { translateY: panPy }],
      }}
    >
      <Image
        source={{ uri }}
        style={styles.rasterImage}
        contentFit="fill"
        cachePolicy="memory-disk"
        recyclingKey={cacheKey}
        transition={0}
      />
    </Animated.View>
  );
});

export function BookingPlanMap({
  planPreview,
  selectedRoomId,
  onSelectRoom,
  height = 420,
  interactive = true,
  highlightOnlySelected = false,
}: Props) {
  const [viewport, setViewport] = useState({ w: 0, h: height - 44 });
  const [zoomLabel, setZoomLabel] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [layerOpacity, setLayerOpacity] = useState(1);

  const zoomRef = useRef(1);
  const panPxRef = useRef(0);
  const panPyRef = useRef(0);
  const pinchBase = useRef(1);
  const panStartPx = useRef({ x: 0, y: 0 });

  const panPx = useRef(new Animated.Value(0)).current;
  const panPy = useRef(new Animated.Value(0)).current;

  const bounds = planPreview?.bounds;
  const planW = bounds?.width ?? (planPreview?.planFieldM.widthM ?? 6) * PX_PER_M;
  const planH = bounds?.height ?? (planPreview?.planFieldM.heightM ?? 4) * PX_PER_M;
  const minX = bounds?.minX ?? 0;
  const minY = bounds?.minY ?? 0;
  const useVector = Boolean(planPreview && hasVectorPlan(planPreview));
  const rasterUri = planPreview?.rasterImage?.dataUrl;

  const canvasW = viewport.w;
  const canvasH = viewport.h;
  const fitLayout = useMemo(
    () => computeFitLayout(canvasW, canvasH, planW, planH),
    [canvasW, canvasH, planW, planH],
  );

  const syncZoomLabel = useCallback((z: number) => {
    setZoomLabel(Math.round(z * 100));
  }, []);

  const applyTransform = useCallback(
    (nextZoom: number, panX: number, panY: number, updateLabel = true) => {
      zoomRef.current = nextZoom;
      panPxRef.current = panX;
      panPyRef.current = panY;
      setZoom(nextZoom);
      panPx.setValue(panX);
      panPy.setValue(panY);
      if (updateLabel) syncZoomLabel(nextZoom);
    },
    [panPx, panPy, syncZoomLabel],
  );

  const applyZoom = useCallback(
    (next: number, updateLabel = true) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, next));
      applyTransform(z, panPxRef.current, panPyRef.current, updateLabel);
    },
    [applyTransform],
  );

  const resetView = useCallback(() => {
    applyTransform(1, 0, 0);
  }, [applyTransform]);

  useEffect(() => {
    resetView();
  }, [planPreview, planW, planH, resetView]);

  useEffect(() => {
    if (!planPreview) return;
    logBooking('PlanMap mount', {
      ...planPreviewStats(planPreview),
      planW,
      planH,
      canvasW,
      canvasH,
      mode: useVector ? 'vector-admin-like' : rasterUri ? 'raster-fallback' : 'zones-only',
    });
  }, [planPreview, planW, planH, canvasW, canvasH, useVector, rasterUri]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    if (width > 0 && h > 0) setViewport({ w: width, h });
  };

  const handleTap = useCallback(
    (locationX: number, locationY: number) => {
      if (!onSelectRoom || !fitLayout) return;
      const pt = screenToPlanFromRaster(
        locationX,
        locationY,
        fitLayout,
        zoomRef.current,
        panPxRef.current,
        panPyRef.current,
        minX,
        minY,
        planW,
        planH,
      );
      const zones = planPreview?.zones ?? [];
      for (let i = zones.length - 1; i >= 0; i--) {
        const z = zones[i];
        if (z.unassigned) continue;
        if (pointInPolygon(pt, z.points)) {
          onSelectRoom(z.roomId);
          return;
        }
      }
    },
    [fitLayout, minX, minY, onSelectRoom, planH, planPreview?.zones, planW],
  );

  const pinchGesture = Gesture.Pinch()
    .enabled(interactive)
    .onBegin(() => {
      setLayerOpacity(0.92);
      pinchBase.current = zoomRef.current;
    })
    .onUpdate((e) => {
      applyZoom(pinchBase.current * e.scale, false);
    })
    .onEnd(() => {
      setLayerOpacity(1);
      syncZoomLabel(zoomRef.current);
    });

  const panGesture = Gesture.Pan()
    .enabled(interactive)
    .minPointers(1)
    .maxPointers(2)
    .activeOffsetX([-14, 14])
    .activeOffsetY([-14, 14])
    .onBegin(() => {
      setLayerOpacity(0.92);
      panStartPx.current = { x: panPxRef.current, y: panPyRef.current };
    })
    .onUpdate((e) => {
      const nx = panStartPx.current.x + e.translationX;
      const ny = panStartPx.current.y + e.translationY;
      panPx.setValue(nx);
      panPy.setValue(ny);
      panPxRef.current = nx;
      panPyRef.current = ny;
    })
    .onEnd(() => {
      setLayerOpacity(1);
    });

  const tapGesture = Gesture.Tap()
    .enabled(interactive && Boolean(onSelectRoom))
    .maxDuration(250)
    .onEnd((e) => {
      handleTap(e.x, e.y);
    });

  const mapGesture = interactive
    ? Gesture.Simultaneous(pinchGesture, panGesture, tapGesture)
    : Gesture.Manual();

  const cacheKey = useMemo(
    () => `${planW}x${planH}-${planPreview?.furniture?.length ?? 0}`,
    [planW, planH, planPreview?.furniture?.length],
  );

  const zones = planPreview?.zones ?? [];
  const hasContent = zones.length > 0 || useVector || Boolean(rasterUri);

  if (!planPreview || !hasContent) {
    return (
      <View style={[styles.wrap, { height }]}>
        <Text style={styles.empty}>План помещения не настроен</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      {interactive && (
        <View style={styles.zoomRow}>
          <Pressable onPress={() => applyZoom(zoomRef.current - 0.35)} style={styles.zoomBtn}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>{zoomLabel}%</Text>
          <Pressable onPress={() => applyZoom(zoomRef.current + 0.35)} style={styles.zoomBtn}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Pressable onPress={resetView} style={styles.fitBtn}>
            <Text style={styles.fitBtnText}>Весь план</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.viewport} onLayout={handleLayout}>
        <GestureDetector gesture={mapGesture}>
          <View style={styles.viewportInner}>
            {canvasW > 0 && canvasH > 0 && fitLayout &&
              (useVector ? (
                <AnimatedPlanLayer
                  planPreview={planPreview}
                  selectedRoomId={selectedRoomId}
                  highlightOnlySelected={highlightOnlySelected}
                  layout={fitLayout}
                  minX={minX}
                  minY={minY}
                  planW={planW}
                  planH={planH}
                  panPx={panPx}
                  panPy={panPy}
                  zoom={zoom}
                  layerOpacity={layerOpacity}
                />
              ) : rasterUri ? (
                <RasterFallback
                  uri={rasterUri}
                  layout={fitLayout}
                  panPx={panPx}
                  panPy={panPy}
                  zoom={zoom}
                  cacheKey={cacheKey}
                />
              ) : (
                <AnimatedPlanLayer
                  planPreview={planPreview}
                  selectedRoomId={selectedRoomId}
                  highlightOnlySelected={highlightOnlySelected}
                  layout={fitLayout}
                  minX={minX}
                  minY={minY}
                  planW={planW}
                  planH={planH}
                  panPx={panPx}
                  panPy={panPy}
                  zoom={zoom}
                  layerOpacity={layerOpacity}
                />
              ))}
          </View>
        </GestureDetector>
      </View>

      {selectedRoomId && (
        <Text style={styles.caption} numberOfLines={1}>
          {zones.find((z) => z.roomId === selectedRoomId)?.name ?? 'Комната'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  empty: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: Colors.textMuted,
    fontSize: Typography.sm,
    padding: Spacing.md,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  zoomBtn: {
    width: 32,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cream,
  },
  zoomBtnText: { fontSize: 18, fontWeight: '700', color: Colors.coffeeDark },
  zoomLabel: { fontSize: Typography.xs, color: Colors.textMuted, minWidth: 44, textAlign: 'center' },
  fitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
  },
  fitBtnText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.coffeeDark },
  viewport: { flex: 1, minHeight: 200, overflow: 'hidden' },
  viewportInner: { flex: 1, overflow: 'hidden' },
  rasterImage: { width: '100%', height: '100%' },
  caption: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.coffeeDark,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
});
