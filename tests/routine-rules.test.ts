import {
  evaluateRoutine,
  routineArchiveDate,
  routineDefinitionFor,
  routineScheduled,
} from '@/features/routines/domain/routine-rules';
import type { RoutineWindow } from '@/features/routines/domain/routine';
import { routine, ownDay } from './helpers/routine-fixtures';
import { habit, day } from './helpers/habit-fixtures';

const today = '2026-10-21';
const window: RoutineWindow = {
  records: [],
  habits: [habit],
  habitRecords: [],
};
describe('routine evaluation from original records', () => {
  it('requires all eligible mandatory steps and ignores an unfinished optional step', () => {
    const result = evaluateRoutine(routine, today, today, {
      ...window,
      records: [ownDay()],
      habitRecords: [day(today)],
    });
    expect(result).toMatchObject({
      completed: 2,
      total: 2,
      percent: 100,
      status: 'completed',
    });
    expect(result.steps[2]?.completed).toBe(false);
  });
  it('preserves absence, false and partial quantity without completing a step', () => {
    const missing = evaluateRoutine(routine, today, today, window);
    const explicit = evaluateRoutine(routine, today, today, {
      ...window,
      records: [ownDay(today, false)],
      habitRecords: [day(today, 10000)],
    });
    expect(missing).toMatchObject({ completed: 0, status: 'pending' });
    expect(missing.steps[0]?.ownRecord).toBeUndefined();
    expect(explicit.steps[0]?.ownRecord?.completed).toBe(false);
    expect(explicit).toMatchObject({ completed: 0, status: 'pending' });
    expect(
      evaluateRoutine(routine, today, today, {
        ...window,
        records: [ownDay()],
      }),
    ).toMatchObject({ completed: 1, status: 'partial', percent: 50 });
  });
  it('shares one habit result across routines, including historical corrections', () => {
    const other = { ...routine, id: '27000000-0000-4000-8000-000000000099' };
    const confirmed = {
      ...window,
      records: [ownDay()],
      habitRecords: [day(today)],
    };
    expect(
      evaluateRoutine(routine, today, today, confirmed).steps[1]?.completed,
    ).toBe(true);
    expect(
      evaluateRoutine(other, today, today, confirmed).steps[1]?.completed,
    ).toBe(true);
    expect(
      evaluateRoutine(routine, today, '2026-10-22', {
        ...confirmed,
        habitRecords: [day(today, 1000)],
      }),
    ).toMatchObject({ status: 'missed', completed: 1 });
  });
  it('excludes non-scheduled and flexible linked steps from mandatory daily obligations', () => {
    const off = {
      ...habit,
      definition: {
        ...habit.definition,
        scheduleType: 'weekdays' as const,
        weekdayMask: 1,
      },
    };
    expect(
      evaluateRoutine(routine, today, today, {
        ...window,
        habits: [off],
        records: [ownDay()],
      }),
    ).toMatchObject({ total: 1, status: 'completed' });
    const flexible = {
      ...habit,
      definition: {
        ...habit.definition,
        scheduleType: 'weekly' as const,
        weeklyTarget: 3,
      },
    };
    const result = evaluateRoutine(routine, today, today, {
      ...window,
      habits: [flexible],
    });
    expect(result.total).toBe(1);
    expect(result.steps[1]).toMatchObject({
      required: false,
      incompatible: true,
      eligible: true,
    });
  });
  it('never completes an empty denominator and does not count optional steps', () => {
    const onlyHabit = {
      ...routine,
      definitions: routine.definitions.map((definition) => ({
        ...definition,
        steps: [definition.steps[1]!],
      })),
    };
    const off = {
      ...habit,
      definition: {
        ...habit.definition,
        scheduleType: 'weekdays' as const,
        weekdayMask: 1,
      },
    };
    expect(
      evaluateRoutine(onlyHabit, today, today, { ...window, habits: [off] }),
    ).toMatchObject({ total: 0, percent: null, status: 'notEvaluable' });
  });
  it('uses historical definitions and resets own steps at the next account date', () => {
    const upcoming = {
      ...routine.definitions[0]!,
      id: '27000000-0000-4000-8000-000000000090',
      effectiveFrom: '2026-10-26',
      steps: [routine.definitions[0]!.steps[2]!],
    };
    const versioned = {
      ...routine,
      definitions: [routine.definitions[0]!, upcoming],
    };
    expect(routineDefinitionFor(versioned, today).steps).toHaveLength(3);
    expect(routineDefinitionFor(versioned, '2026-10-26').steps).toHaveLength(1);
    expect(
      evaluateRoutine(routine, '2026-10-22', '2026-10-22', {
        ...window,
        records: [ownDay()],
        habitRecords: [day(today)],
      }),
    ).toMatchObject({ completed: 0, status: 'pending' });
  });
  it('keeps future, pre-start, off-day and archived dates distinct with explicit time zone', () => {
    expect(evaluateRoutine(routine, '2026-09-30', today, window).status).toBe(
      'notStarted',
    );
    expect(evaluateRoutine(routine, '2026-10-22', today, window).status).toBe(
      'future',
    );
    const selected = {
      ...routine,
      definitions: [
        {
          ...routine.definitions[0]!,
          scheduleType: 'weekdays' as const,
          weekdayMask: 1,
        },
      ],
    };
    expect(evaluateRoutine(selected, today, today, window).status).toBe(
      'notScheduled',
    );
    const archived = { ...routine, archivedAt: '2026-10-22T02:00:00Z' };
    expect(routineArchiveDate(archived)).toBe('2026-10-21');
    expect(routineScheduled(archived, '2026-10-22')).toBe(false);
    const dst = {
      ...routine,
      archivedAt: '2026-11-01T04:30:00Z',
      definitions: [
        { ...routine.definitions[0]!, timeZone: 'America/New_York' },
      ],
    };
    expect(routineArchiveDate(dst)).toBe('2026-11-01');
  });
  it('rejects a missing linked origin instead of silently treating it as an empty day', () => {
    expect(() =>
      evaluateRoutine(routine, today, today, { ...window, habits: [] }),
    ).toThrow('service');
  });
});
