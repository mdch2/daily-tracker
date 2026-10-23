import {
  addBusinessDays,
  canRecord,
  dayStatus,
  isCompleted,
  isEligible,
  weeklyProgress,
  weekStart,
} from '@/features/habits/domain/habit-rules';
import type { Habit } from '@/features/habits/domain/habit';
import { habit, day } from './helpers/habit-fixtures';

const today = '2026-10-21';
const weekly: Habit = {
  ...habit,
  definition: { ...habit.definition, scheduleType: 'weekly', weeklyTarget: 3 },
};
describe('habit calendar and confirmed progress', () => {
  it.each([
    [15000, false],
    [20000, true],
    [30000, true],
    [0, false],
  ] as const)(
    'evaluates the minimum for %s without losing the confirmed amount',
    (amount, expected) => {
      const record = day(today, amount);
      expect(isCompleted(habit, record)).toBe(expected);
      expect(record.amountMilliunits).toBe(amount);
    },
  );
  it('distinguishes absent, explicit zero and false', () => {
    expect(isCompleted(habit)).toBe(false);
    expect(dayStatus(habit, today, today)).toBe('pending');
    expect(day(today, 0).amountMilliunits).toBe(0);
    const binary: Habit = {
      ...habit,
      definition: { ...habit.definition, measurementMode: 'binary' },
    };
    expect(
      isCompleted(binary, { ...day(today, null), binaryValue: false }),
    ).toBe(false);
    expect(isCompleted(binary, day(today, null))).toBe(true);
  });
  it('does not close an open day before midnight', () => {
    expect(dayStatus(habit, today, today, day(today, 15000))).toBe('partial');
    expect(dayStatus(habit, today, '2026-10-22', day(today, 15000))).toBe(
      'missed',
    );
    expect(dayStatus(habit, today, '2026-10-22', day(today, 20000))).toBe(
      'completed',
    );
  });
  it('excludes unassigned dates and never treats them as missed', () => {
    const assigned: Habit = {
      ...habit,
      definition: {
        ...habit.definition,
        scheduleType: 'weekdays',
        weekdayMask: 17,
      },
    };
    expect(isEligible(assigned, '2026-10-19')).toBe(true);
    expect(isEligible(assigned, '2026-10-23')).toBe(true);
    expect(dayStatus(assigned, '2026-10-20', today)).toBe('notScheduled');
    expect(canRecord(assigned, '2026-10-20', today)).toBe(false);
  });
  it('enforces the inclusive date window, start date and future', () => {
    expect(canRecord(habit, '2026-10-14', today)).toBe(true);
    expect(canRecord(habit, '2026-10-13', today)).toBe(false);
    expect(canRecord(habit, '2026-10-22', today)).toBe(false);
    expect(canRecord({ ...habit, startDate: today }, '2026-10-20', today)).toBe(
      false,
    );
    expect(canRecord(habit, '2026-10-14', '2026-10-22')).toBe(false);
  });
  it('uses calendar arithmetic across years, leap days and DST dates', () => {
    expect(addBusinessDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addBusinessDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addBusinessDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addBusinessDays('2026-11-01', 1)).toBe('2026-11-02');
  });
  it('distinguishes Sunday and Monday week starts', () => {
    expect(weekStart('2026-10-18', 1)).toBe('2026-10-12');
    expect(weekStart('2026-10-19', 1)).toBe('2026-10-19');
    expect(weekStart('2026-10-18', 7)).toBe('2026-10-18');
    expect(weekStart('2026-10-19', 7)).toBe('2026-10-18');
  });
  it('counts distinct dates rather than quantities or contributions', () => {
    const result = weeklyProgress(
      weekly,
      [day('2026-10-19', 40000), day('2026-10-19', 40000), day('2026-10-20')],
      '2026-10-19',
      today,
    );
    expect(result.days).toBe(2);
    expect(result.status).toBe('pending');
    expect(dayStatus(weekly, '2026-10-19', today)).toBe('unrecorded');
  });
  it('does not evaluate the first partial week even when the target is reached', () => {
    const partial = { ...weekly, startDate: '2026-10-20' };
    const records = [day('2026-10-20'), day('2026-10-21'), day('2026-10-22')];
    expect(
      weeklyProgress(partial, records, '2026-10-19', '2026-10-26'),
    ).toMatchObject({ days: 3, target: 3, status: 'partialWeek' });
  });
  it('closes full weeks and recalculates corrections in both directions', () => {
    const records = [day('2026-10-19'), day('2026-10-20'), day('2026-10-21')];
    const evaluate = (values: typeof records) =>
      weeklyProgress(weekly, values, '2026-10-19', '2026-10-26');
    expect(evaluate(records)).toMatchObject({
      days: 3,
      status: 'completed',
      start: '2026-10-19',
      end: '2026-10-26',
    });
    expect(
      evaluate([records[0]!, day('2026-10-20', 15000), records[2]!]),
    ).toMatchObject({
      days: 2,
      status: 'missed',
      start: '2026-10-19',
      end: '2026-10-26',
    });
    expect(evaluate(records).status).toBe('completed');
  });
});
