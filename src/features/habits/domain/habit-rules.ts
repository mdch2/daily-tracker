import type { Habit, HabitDayRecord } from './habit';

// Arithmetic on calendar labels, never conversion of an instant to a business date.
export function addBusinessDays(date: string, days: number): string {
  const value = new Date(date + 'T00:00:00.000Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekStart(date: string, firstDay: 1 | 7): string {
  const isoDay = new Date(date + 'T00:00:00.000Z').getUTCDay() || 7;
  return addBusinessDays(date, -((isoDay - firstDay + 7) % 7));
}
export function isEligible(habit: Habit, date: string): boolean {
  if (date < habit.startDate) return false;
  if (habit.definition.scheduleType !== 'weekdays') return true;
  const isoDay = new Date(date + 'T00:00:00.000Z').getUTCDay() || 7;
  return (habit.definition.weekdayMask & (1 << (isoDay - 1))) !== 0;
}
export function isCompleted(habit: Habit, record?: HabitDayRecord): boolean {
  if (!record) return false;
  return habit.definition.measurementMode === 'binary'
    ? record.binaryValue === true
    : record.amountMilliunits !== null &&
        record.amountMilliunits >= habit.definition.targetMilliunits;
}
export function canRecord(habit: Habit, date: string, today: string): boolean {
  return (
    isEligible(habit, date) &&
    date <= today &&
    date >= addBusinessDays(today, -7)
  );
}
export type DayStatus =
  | 'notStarted'
  | 'notScheduled'
  | 'future'
  | 'completed'
  | 'partial'
  | 'pending'
  | 'missed'
  | 'unrecorded';
export function dayStatus(
  habit: Habit,
  date: string,
  today: string,
  record?: HabitDayRecord,
): DayStatus {
  if (date < habit.startDate) return 'notStarted';
  if (!isEligible(habit, date)) return 'notScheduled';
  if (date > today) return 'future';
  if (isCompleted(habit, record)) return 'completed';
  if (habit.definition.scheduleType !== 'weekly' && date < today)
    return 'missed';
  if (record?.amountMilliunits && record.amountMilliunits > 0) return 'partial';
  return habit.definition.scheduleType === 'weekly' ? 'unrecorded' : 'pending';
}
export function weeklyProgress(
  habit: Habit,
  records: HabitDayRecord[],
  start: string,
  today: string,
) {
  if (habit.definition.scheduleType !== 'weekly')
    throw new Error('Weekly schedule required');
  const end = addBusinessDays(start, 7);
  const days = new Set(
    records
      .filter(
        (record) =>
          record.date >= start &&
          record.date < end &&
          isEligible(habit, record.date) &&
          isCompleted(habit, record),
      )
      .map((record) => record.date),
  ).size;
  const partial = habit.startDate > start && habit.startDate < end;
  const status =
    habit.startDate >= end
      ? 'notStarted'
      : partial
        ? 'partialWeek'
        : days >= habit.definition.weeklyTarget
          ? 'completed'
          : today >= end
            ? 'missed'
            : 'pending';
  return {
    days,
    target: habit.definition.weeklyTarget,
    start,
    end,
    status,
  } as const;
}
