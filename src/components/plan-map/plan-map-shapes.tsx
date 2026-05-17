import { memo, type ReactNode } from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import type { PlanPreviewFurniture } from '@/api/cafe-layout';

export const PX_PER_M = 200;
const LABEL_SIZE = 24;
const STAIR_STROKE = '#374151';
const STAIR_FILL = 'rgba(249,250,251,0.95)';

export function furnitureBounds(item: { x: number; y: number; widthM: number; heightM: number }) {
  const w = item.widthM * PX_PER_M;
  const h = item.heightM * PX_PER_M;
  return { x: item.x - w / 2, y: item.y - h / 2, w, h };
}

export function furnitureTransform(item: { x: number; y: number; rotationDeg?: number }) {
  const r = item.rotationDeg ?? 0;
  return r ? `rotate(${r} ${item.x} ${item.y})` : undefined;
}

function label(x: number, y: number, text: string, fill = '#374151') {
  if (!text.trim()) return null;
  return (
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      alignmentBaseline="middle"
      fontSize={LABEL_SIZE}
      fill={fill}
      fontWeight="600"
    >
      {text}
    </SvgText>
  );
}

function stepsUp(x0: number, y0: number, w: number, h: number, count: number, vertical: boolean) {
  const paths: string[] = [];
  const n = Math.max(6, count);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (vertical) {
      const y = y0 + h * (1 - t);
      paths.push(`M ${x0} ${y} L ${x0 + w * t} ${y}`);
    } else {
      const x = x0 + w * t;
      paths.push(`M ${x} ${y0 + h} L ${x} ${y0 + h * (1 - t)}`);
    }
  }
  return paths;
}

function stepsDown(x0: number, y0: number, w: number, h: number, count: number, vertical: boolean) {
  const paths: string[] = [];
  const n = Math.max(6, count);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (vertical) {
      const y = y0 + h * t;
      paths.push(`M ${x0 + w} ${y} L ${x0 + w * (1 - t)} ${y}`);
    } else {
      const x = x0 + w * (1 - t);
      paths.push(`M ${x} ${y0} L ${x} ${y0 + h * t}`);
    }
  }
  return paths;
}

function roundStepPaths(cx: number, cy: number, rx: number, ry: number) {
  const paths: string[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 1.5 - Math.PI * 0.25;
    const a1 = ((i + 0.85) / n) * Math.PI * 1.5 - Math.PI * 0.25;
    paths.push(
      `M ${cx + Math.cos(a0) * rx * 0.35} ${cy + Math.sin(a0) * ry * 0.35} L ${cx + Math.cos(a1) * rx} ${cy + Math.sin(a1) * ry}`,
    );
  }
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    const a = t * Math.PI * 1.5 - Math.PI * 0.25;
    const rxi = rx * (0.4 + t * 0.55);
    const ryi = ry * (0.4 + t * 0.55);
    paths.push(
      `M ${cx + Math.cos(a) * rxi * 0.9} ${cy + Math.sin(a) * ryi * 0.9} A ${rxi} ${ryi} 0 0 1 ${cx + Math.cos(a + 0.15) * rxi} ${cy + Math.sin(a + 0.15) * ryi}`,
    );
  }
  return paths;
}

export function findStairPartner(item: PlanPreviewFurniture, stairs: PlanPreviewFurniture[]) {
  if (!item.pairId) return undefined;
  return stairs.find((s) => s.id !== item.id && s.pairId === item.pairId);
}

export function StairPartnerLinks({ stairs }: { stairs: PlanPreviewFurniture[] }) {
  const drawn = new Set<string>();
  const links: ReactNode[] = [];
  for (const st of stairs) {
    if (!st.pairId || drawn.has(st.pairId)) continue;
    const partner = findStairPartner(st, stairs);
    if (!partner) continue;
    if (st.pairRole !== 'up' && st.pairRole) continue;
    drawn.add(st.pairId);
    links.push(
      <Line
        key={`link-${st.pairId}`}
        x1={st.x}
        y1={st.y}
        x2={partner.x}
        y2={partner.y}
        stroke="#6b7280"
        strokeWidth={1.4}
        strokeDasharray="6 4"
      />,
    );
  }
  return <>{links}</>;
}

function StepPaths({ paths, stroke }: { paths: string[]; stroke: string }) {
  return (
    <>
      {paths.map((d, i) => (
        <Path key={i} d={d} fill="none" stroke={stroke} strokeWidth={1} opacity={0.85} />
      ))}
    </>
  );
}

export const StairShape = memo(function StairShape({ item }: { item: PlanPreviewFurniture }) {
  const b = furnitureBounds(item);
  const tf = furnitureTransform(item);
  const kind = item.stairKind || 'rect';
  const stepCount = Math.max(6, Math.floor(Math.min(b.w, b.h) / 10));
  const name = item.name || 'Лестница';

  const wrap = (body: ReactNode) => (tf ? <G transform={tf}>{body}</G> : <G>{body}</G>);

  if (kind === 'half_room') {
    const role = item.pairRole;
    const paths =
      role === 'down'
        ? stepsDown(b.x + 2, b.y + 2, b.w - 4, b.h - 4, Math.max(6, Math.floor(b.h / 12)), true)
        : stepsUp(b.x + 2, b.y + 2, b.w - 4, b.h - 4, Math.max(6, Math.floor(b.h / 12)), true);
    return wrap(
      <>
        <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill={STAIR_FILL} stroke={STAIR_STROKE} strokeWidth={1.5} />
        <StepPaths paths={paths} stroke={STAIR_STROKE} />
        {label(item.x, item.y, name)}
      </>,
    );
  }

  if (kind === 'round') {
    const rx = b.w / 2;
    const ry = b.h / 2;
    const paths = roundStepPaths(item.x, item.y, rx, ry);
    return wrap(
      <>
        <Ellipse
          cx={item.x}
          cy={item.y}
          rx={rx}
          ry={ry}
          fill={STAIR_FILL}
          stroke={STAIR_STROKE}
          strokeWidth={1.5}
        />
        <StepPaths paths={paths} stroke={STAIR_STROKE} />
        {label(item.x, item.y, name)}
      </>,
    );
  }

  const midX = b.x + b.w / 2;
  const left = { x: b.x, y: b.y, w: b.w / 2 - 1, h: b.h };
  const right = { x: midX + 1, y: b.y, w: b.w / 2 - 1, h: b.h };
  const upPaths = stepsUp(left.x + 2, left.y + 2, left.w - 4, left.h - 4, stepCount, true);
  const downPaths = stepsDown(right.x + 2, right.y + 2, right.w - 4, right.h - 4, stepCount, true);

  return wrap(
    <>
      <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill={STAIR_FILL} stroke={STAIR_STROKE} strokeWidth={1.5} />
      <Line x1={midX} y1={b.y} x2={midX} y2={b.y + b.h} stroke={STAIR_STROKE} strokeWidth={0.8} opacity={0.45} />
      <StepPaths paths={upPaths} stroke={STAIR_STROKE} />
      <StepPaths paths={downPaths} stroke={STAIR_STROKE} />
      {label(item.x, item.y, name)}
    </>,
  );
});

export const TableShape = memo(function TableShape({ item }: { item: PlanPreviewFurniture }) {
  const b = furnitureBounds(item);
  const shape = item.shape || 'rect';
  const tf = furnitureTransform(item);
  const fill = 'rgba(217,119,6,0.35)';
  const stroke = '#b45309';
  return (
    <G transform={tf}>
      {shape === 'oval' ? (
        <Ellipse cx={item.x} cy={item.y} rx={b.w / 2} ry={b.h / 2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      ) : (
        <Rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={shape === 'rounded' ? Math.min(b.w, b.h) * 0.18 : 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      )}
      {label(item.x, item.y, item.name || 'Стол')}
    </G>
  );
});

export const ChairShape = memo(function ChairShape({ item }: { item: PlanPreviewFurniture }) {
  const b = furnitureBounds(item);
  const tf = furnitureTransform(item);
  const fill = 'rgba(87,83,78,0.4)';
  const stroke = '#57534e';
  const v = item.variant || 'standard';
  return (
    <G transform={tf}>
      {v === 'bar' ? (
        <>
          <Rect
            x={b.x + b.w * 0.35}
            y={b.y + b.h * 0.35}
            width={b.w * 0.3}
            height={b.h * 0.65}
            rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
          />
          <Rect
            x={b.x + b.w * 0.42}
            y={b.y + b.h * 0.08}
            width={b.w * 0.16}
            height={b.h * 0.3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
        </>
      ) : v === 'office' ? (
        <>
          <Rect
            x={b.x + b.w * 0.15}
            y={b.y + b.h * 0.55}
            width={b.w * 0.7}
            height={b.h * 0.12}
            rx={2}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
          <Rect
            x={b.x + b.w * 0.22}
            y={b.y + b.h * 0.2}
            width={b.w * 0.56}
            height={b.h * 0.38}
            rx={5}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.4}
          />
        </>
      ) : v === 'pouf' ? (
        <Circle cx={item.x} cy={item.y} r={Math.min(b.w, b.h) / 2} fill={fill} stroke={stroke} strokeWidth={1.4} />
      ) : (
        <>
          <Rect
            x={b.x + b.w * 0.12}
            y={b.y + b.h * 0.08}
            width={b.w * 0.76}
            height={b.h * 0.22}
            rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
          />
          <Rect
            x={b.x + b.w * 0.18}
            y={b.y + b.h * 0.3}
            width={b.w * 0.64}
            height={b.h * 0.55}
            rx={4}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
          />
        </>
      )}
      {label(b.x + b.w / 2, b.y + b.h * 0.62, item.name || 'Стул', '#44403c')}
    </G>
  );
});

export const FixtureShape = memo(function FixtureShape({ item }: { item: PlanPreviewFurniture }) {
  const b = furnitureBounds(item);
  const tf = furnitureTransform(item);
  const stroke = '#374151';
  const fill = 'rgba(255,255,255,0.95)';
  const cx = item.x;
  const cy = item.y;
  const kind = item.kind;

  let body = <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill={fill} stroke={stroke} strokeWidth={1.2} />;

  switch (kind) {
    case 'sofa':
      body = (
        <>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill={fill} stroke={stroke} strokeWidth={1.3} />
          <Rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h * 0.22}
            rx={3}
            fill="rgba(55,65,81,0.15)"
            stroke={stroke}
            strokeWidth={0.8}
          />
          {item.sofaStyle === 'corner' && (
            <Rect
              x={b.x + b.w * 0.65}
              y={b.y + b.h * 0.22}
              width={b.w * 0.35}
              height={b.h * 0.55}
              rx={3}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.8}
            />
          )}
        </>
      );
      break;
    case 'toilet':
      body = (
        <>
          <Rect
            x={b.x + b.w * 0.15}
            y={b.y}
            width={b.w * 0.7}
            height={b.h * 0.55}
            rx={b.w * 0.2}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
          />
          <Rect
            x={b.x + b.w * 0.2}
            y={b.y + b.h * 0.5}
            width={b.w * 0.6}
            height={b.h * 0.45}
            rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
        </>
      );
      break;
    case 'sink':
      body = (
        <>
          <Rect
            x={b.x}
            y={b.y + b.h * 0.35}
            width={b.w}
            height={b.h * 0.35}
            rx={3}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
          />
          <Ellipse
            cx={cx}
            cy={b.y + b.h * 0.52}
            rx={b.w * 0.22}
            ry={b.h * 0.18}
            fill="#e5e7eb"
            stroke={stroke}
            strokeWidth={0.8}
          />
        </>
      );
      break;
    case 'tv_wall':
      body = (
        <>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#1f2937" stroke={stroke} strokeWidth={1} />
          <Rect x={b.x + b.w * 0.08} y={b.y + b.h * 0.15} width={b.w * 0.84} height={b.h * 0.7} fill="#374151" />
        </>
      );
      break;
    case 'tv_stand':
      body = (
        <>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h * 0.34} fill="#1f2937" stroke={stroke} strokeWidth={1} />
          <Rect
            x={b.x + b.w * 0.32}
            y={b.y + b.h * 0.34}
            width={b.w * 0.36}
            height={b.h * 0.58}
            rx={2}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
        </>
      );
      break;
    case 'whiteboard':
      body = (
        <>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h * 0.75} fill="#f8fafc" stroke={stroke} strokeWidth={1.2} />
          <Line x1={b.x} y1={b.y + b.h * 0.75} x2={b.x + b.w} y2={b.y + b.h * 0.75} stroke={stroke} strokeWidth={1.5} />
        </>
      );
      break;
    default:
      break;
  }

  return (
    <G transform={tf}>
      {body}
      {label(cx, cy, item.name || kind)}
    </G>
  );
});

export const FurnitureShape = memo(function FurnitureShape({ item }: { item: PlanPreviewFurniture }) {
  if (item.kind === 'table') return <TableShape item={item} />;
  if (item.kind === 'chair') return <ChairShape item={item} />;
  if (item.kind === 'stair') return <StairShape item={item} />;
  return <FixtureShape item={item} />;
});
