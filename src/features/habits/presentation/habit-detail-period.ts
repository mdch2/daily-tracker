import { addBusinessDays, weekStart } from '../domain/habit-rules';

export type HabitPeriod = 'week' | 'month' | 'quarter' | 'year';

function monthStart(date: string, offset: number) {
  const value = new Date(date + 'T00:00:00.000Z');
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}

// Calendar periods are presentation windows, independent of compliance rules.
export function habitDetailPeriod(
  date: string,
  firstDay: 1 | 7,
  period: HabitPeriod,
  page: number,
) {
  const start =
    period === 'week'
      ? addBusinessDays(weekStart(date, firstDay), -page * 7)
      : period === 'year'
        ? monthStart(date.slice(0, 4) + '-01-01', -page * 12)
        : monthStart(date, -(period === 'quarter' ? page * 3 + 2 : page));
  const end =
    period === 'week'
      ? addBusinessDays(start, 6)
      : addBusinessDays(
          monthStart(
            start,
            period === 'year' ? 12 : period === 'quarter' ? 3 : 1,
          ),
          -1,
        );
  const mapStart = weekStart(start, firstDay);
  const mapEnd = addBusinessDays(weekStart(end, firstDay), 6);
  const weeks =
    Math.floor((Date.parse(mapEnd) - Date.parse(mapStart)) / 86400000 / 7) + 1;
  return { start, end, mapStart, mapEnd, weeks };
}
