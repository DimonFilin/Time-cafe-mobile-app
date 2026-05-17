import { memo } from 'react';
import { Animated } from 'react-native';

import type { PlanPreview } from '@/api/cafe-layout';

import type { FitLayout } from './plan-map-coords';
import { PlanVectorScene } from './PlanVectorScene';

type Props = {
  planPreview: PlanPreview;
  selectedRoomId: string | null;
  highlightOnlySelected: boolean;
  layout: FitLayout;
  minX: number;
  minY: number;
  planW: number;
  planH: number;
  panPx: Animated.Value;
  panPy: Animated.Value;
  /** Layout zoom — real pixel size, not transform scale (stays sharp when zoomed in). */
  zoom: number;
  layerOpacity: number;
};

export const AnimatedPlanLayer = memo(function AnimatedPlanLayer({
  planPreview,
  selectedRoomId,
  highlightOnlySelected,
  layout,
  minX,
  minY,
  planW,
  planH,
  panPx,
  panPy,
  zoom,
  layerOpacity,
}: Props) {
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
      <PlanVectorScene
        planPreview={planPreview}
        minX={minX}
        minY={minY}
        planW={planW}
        planH={planH}
        pixelW={w}
        pixelH={h}
        selectedRoomId={selectedRoomId}
        highlightOnlySelected={highlightOnlySelected}
        layerOpacity={layerOpacity}
      />
    </Animated.View>
  );
});
