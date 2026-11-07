import { day, habit } from './helpers/habit-fixtures';
import type { Habit, HabitDefinition } from '@/features/habits/domain/habit';
import {
  definitionFor,
  dayStatus,
  isEligible,
  weeklyProgress,
  pendingDefinition,
} from '@/features/habits/domain/habit-rules';

const future: HabitDefinition = {
  ...habit.definition,
  id: '31000000-0000-4000-8000-000000000009',
  effectiveFrom: '2026-10-26',
  measurementMode: 'quantity',
  targetMilliunits: 30000,
  unitLabel: 'pages',
  scheduleType: 'weekly',
  weeklyTarget: 2,
};
const versioned: Habit = {
  ...habit,
  definitionHistory: [future, habit.definition],
};
describe('historical habit definitions', () => {
  it('keeps each date on its historical goal even when definitions arrive unsorted', () => {
    expect(definitionFor(versioned, '2026-10-25').id).toBe(habit.definition.id);
    expect(definitionFor(versioned, '2026-10-26').id).toBe(future.id);
    expect(
      dayStatus(
        versioned,
        '2026-10-25',
        '2026-10-27',
        day('2026-10-25', 20000),
      ),
    ).toBe('completed');
    expect(
      dayStatus(versioned, '2026-10-26', '2026-10-27', {
        ...day('2026-10-26', 20000),
        definitionId: future.id,
      }),
    ).toBe('partial');
    expect(pendingDefinition(versioned, '2026-10-25')?.effectiveFrom).toBe(
      '2026-10-26',
    );
    expect(pendingDefinition(versioned, '2026-10-26')).toBeUndefined();
  });
  it('uses the weekly target of each complete week and does not move excess across dates', () => {
    const old: HabitDefinition = {
      ...habit.definition,
      scheduleType: 'weekly',
      weeklyTarget: 3,
    };
    const h: Habit = {
      ...versioned,
      definition: old,
      definitionHistory: [old, future],
    };
    const rows = [
      day('2026-10-19'),
      day('2026-10-21'),
      { ...day('2026-10-26', 30000), definitionId: future.id },
      { ...day('2026-10-28', 90000), definitionId: future.id },
    ];
    expect(weeklyProgress(h, rows, '2026-10-19', '2026-11-02')).toMatchObject({
      days: 2,
      target: 3,
      status: 'missed',
    });
    expect(weeklyProgress(h, rows, '2026-10-26', '2026-11-02')).toMatchObject({
      days: 2,
      target: 2,
      status: 'completed',
    });
  });
  it('changes eligible weekdays only from the new effective week', () => {
    const h: Habit = {
      ...versioned,
      definitionHistory: [
        habit.definition,
        { ...future, scheduleType: 'weekdays', weekdayMask: 31 },
      ],
    };
    expect(isEligible(h, '2026-10-24')).toBe(true);
    expect(isEligible(h, '2026-10-31')).toBe(false);
    expect(dayStatus(h, '2026-10-31', '2026-11-01')).toBe('notScheduled');
  });
});
