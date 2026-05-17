import { memo, useMemo, type ReactNode } from 'react';
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { PlanPreview, PlanPreviewZone } from '@/api/cafe-layout';

import { polygonAreaSqM, zoneCenter } from './plan-map-coords';
import {
  FurnitureShape,
  PX_PER_M,
  StairPartnerLinks,
} from './plan-map-shapes';

const GRID_STEP = 20;
const WALL_STROKE = 10;
const ZONE_LABEL_W = 156;
const ZONE_LABEL_H = 44;
const ZONE_NAME_SIZE = 12;
const ZONE_AREA_SIZE = 11;

function zoneStyle(
  zone: PlanPreviewZone,
  selectedRoomId: string | null,
  highlightOnlySelected: boolean,
): { fill: string; stroke: string; strokeWidth: number; opacity: number } {
  const active = zone.roomId === selectedRoomId;
  const dim =
    !highlightOnlySelected && !!selectedRoomId && zone.roomId !== selectedRoomId;
  if (highlightOnlySelected && zone.roomId !== selectedRoomId) {
    return { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, opacity: 0 };
  }
  if (zone.unassigned) {
    return {
      fill: 'rgba(0,0,0,0.02)',
      stroke: '#9ca3af',
      strokeWidth: 2.5,
      opacity: dim ? 0.35 : 1,
    };
  }
  if (active) {
    return {
      fill: 'rgba(234,88,12,0.15)',
      stroke: '#ea580c',
      strokeWidth: 3.5,
      opacity: 1,
    };
  }
  return {
    fill: 'rgba(0,0,0,0.03)',
    stroke: '#a8a29e',
    strokeWidth: 2.5,
    opacity: dim ? 0.4 : 1,
  };
}

type Props = {
  planPreview: PlanPreview;
  minX: number;
  minY: number;
  planW: number;
  planH: number;
  pixelW: number;
  pixelH: number;
  selectedRoomId: string | null;
  highlightOnlySelected: boolean;
  layerOpacity?: number;
};

export const PlanVectorScene = memo(function PlanVectorScene({
  planPreview,
  minX,
  minY,
  planW,
  planH,
  pixelW,
  pixelH,
  selectedRoomId,
  highlightOnlySelected,
  layerOpacity = 1,
}: Props) {
  const viewBox = `${minX} ${minY} ${planW} ${planH}`;
  const zones = planPreview.zones ?? [];
  const walls = planPreview.walls ?? [];
  const furniture = planPreview.furniture ?? [];
  const openings = planPreview.openings ?? [];
  const stairs = useMemo(() => furniture.filter((f) => f.kind === 'stair'), [furniture]);

  const gridLines = useMemo(() => {
    const lines: ReactNode[] = [];
    const x0 = Math.floor(minX / GRID_STEP) * GRID_STEP;
    const y0 = Math.floor(minY / GRID_STEP) * GRID_STEP;
    const xEnd = minX + planW;
    const yEnd = minY + planH;
    for (let x = x0; x <= xEnd; x += GRID_STEP) {
      lines.push(
        <Line
          key={`gx-${x}`}
          x1={x}
          y1={minY}
          x2={x}
          y2={yEnd}
          stroke="#eef2f7"
          strokeWidth={1}
        />,
      );
    }
    for (let y = y0; y <= yEnd; y += GRID_STEP) {
      lines.push(
        <Line
          key={`gy-${y}`}
          x1={minX}
          y1={y}
          x2={xEnd}
          y2={y}
          stroke="#eef2f7"
          strokeWidth={1}
        />,
      );
    }
    return lines;
  }, [minX, minY, planW, planH]);

  return (
    <Svg
      width={pixelW}
      height={pixelH}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      opacity={layerOpacity}
    >
      <Rect x={minX} y={minY} width={planW} height={planH} fill="#fafafa" />
      <G>{gridLines}</G>

      {walls.map((wall, i) => (
        <Line
          key={`wall-${i}`}
          x1={wall.x1}
          y1={wall.y1}
          x2={wall.x2}
          y2={wall.y2}
          stroke="#1f2937"
          strokeWidth={WALL_STROKE}
          strokeLinecap="round"
        />
      ))}

      {openings.map((o, i) => (
        <Line
          key={`open-${i}`}
          x1={o.x1}
          y1={o.y1}
          x2={o.x2}
          y2={o.y2}
          stroke="#64748b"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}

      {zones.map((zone) => {
        const st = zoneStyle(zone, selectedRoomId, highlightOnlySelected);
        if (st.opacity <= 0) return null;
        const pts = zone.points.map((p) => `${p.x},${p.y}`).join(' ');
        const center = zoneCenter(zone);
        const areaM2 = polygonAreaSqM(zone.points);
        return (
          <G key={zone.roomId} opacity={st.opacity}>
            <Polygon
              points={pts}
              fill={st.fill}
              stroke={st.stroke}
              strokeWidth={st.strokeWidth}
              strokeDasharray={zone.unassigned ? '8 5' : undefined}
            />
            <Rect
              x={center.x - ZONE_LABEL_W / 2}
              y={center.y - ZONE_LABEL_H / 2 + 2}
              width={ZONE_LABEL_W}
              height={ZONE_LABEL_H}
              rx={7}
              fill="white"
              stroke="#93c5fd"
              strokeWidth={1}
            />
            <SvgText
              x={center.x}
              y={center.y - 6}
              textAnchor="middle"
              fontSize={ZONE_NAME_SIZE}
              fill="#1e3a8a"
              fontWeight="600"
            >
              {zone.name}
            </SvgText>
            <SvgText
              x={center.x}
              y={center.y + 10}
              textAnchor="middle"
              fontSize={ZONE_AREA_SIZE}
              fill="#64748b"
            >
              {areaM2 != null ? `${areaM2.toFixed(1)} m²` : '—'}
            </SvgText>
          </G>
        );
      })}

      <StairPartnerLinks stairs={stairs} />
      {furniture.map((item) => (
        <FurnitureShape key={`${item.kind}-${item.x}-${item.y}-${item.name ?? ''}`} item={item} />
      ))}
    </Svg>
  );
});

export { PX_PER_M };
