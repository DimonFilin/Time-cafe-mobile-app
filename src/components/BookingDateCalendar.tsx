import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CafeOccupancyRange } from '@/api/cafe-layout';
import { Colors, Radius, Spacing, Typography } from '@/utils/theme';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  occupancyByDate?: Map<string, number>;
  loading?: boolean;
  onMonthChange?: (monthStart: Date) => void;
};

export function BookingDateField({ value, onChange, occupancyByDate, loading, onMonthChange }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    try {
      return parseISO(value);
    } catch {
      return new Date();
    }
  }, [value]);
  const [month, setMonth] = useState(() => startOfMonth(parsed));

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const label = useMemo(() => {
    try {
      return format(parseISO(value), 'd MMMM yyyy', { locale: ru });
    } catch {
      return value;
    }
  }, [value]);

  useEffect(() => {
    if (!open || !onMonthChange) return;
    onMonthChange(month);
  }, [open, month, onMonthChange]);

  const goMonth = (delta: number) => {
    setMonth((m) => (delta < 0 ? subMonths(m, 1) : addMonths(m, 1)));
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.coffeeDark} />
        <Text style={styles.fieldText}>{label}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Pressable onPress={() => goMonth(-1)} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={Colors.coffeeDark} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {format(month, 'LLLL yyyy', { locale: ru })}
              </Text>
              <Pressable onPress={() => goMonth(1)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={22} color={Colors.coffeeDark} />
              </Pressable>
            </View>
            {loading && <Text style={styles.loading}>Загрузка загруженности…</Text>}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d) => (
                <Text key={d} style={styles.weekday}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {gridDays.map((day) => {
                const ymd = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, month);
                const selected = isSameDay(day, parsed);
                const occ = occupancyByDate?.get(ymd);
                return (
                  <Pressable
                    key={ymd}
                    onPress={() => {
                      onChange(ymd);
                      setOpen(false);
                    }}
                    style={[
                      styles.dayCell,
                      !inMonth && styles.dayCellMuted,
                      selected && styles.dayCellSelected,
                    ]}
                  >
                    <Text style={[styles.dayNum, selected && styles.dayNumSelected]}>
                      {format(day, 'd')}
                    </Text>
                    {inMonth && occ != null && (
                      <Text style={[styles.occPct, selected && styles.occPctSelected]}>
                        {occ}%
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Готово</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function occupancyRangeToMap(data: CafeOccupancyRange | undefined) {
  const map = new Map<string, number>();
  if (!data || data.mode !== 'range') return map;
  for (const day of data.days) {
    map.set(day.date, day.occupancyPercent);
  }
  return map;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldText: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  monthTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: Colors.coffeeDark,
    textTransform: 'capitalize',
  },
  loading: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    padding: 2,
  },
  dayCellMuted: { opacity: 0.35 },
  dayCellSelected: { backgroundColor: Colors.coffeeDark },
  dayNum: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  dayNumSelected: { color: Colors.textInverse },
  occPct: { fontSize: 9, color: Colors.coffee, marginTop: 1 },
  occPctSelected: { color: Colors.cream },
  closeBtn: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeBtnText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.coffeeDark },
});
