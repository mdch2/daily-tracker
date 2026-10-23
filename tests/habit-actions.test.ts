import {
  createHabitActions,
  parseMilliunits,
} from '@/features/habits/application/habit-actions';
import { createCalendarActions } from '@/features/profile/application/calendar-actions';
import type { ProfileRepository } from '@/features/profile/domain/profile-repository';
import { OperationError } from '@/shared/domain/operation-error';
import { habitId, operationId, repositoryStub } from './helpers/habit-fixtures';

describe('habit write boundaries', () => {
  it.each([
    ['0', 0],
    ['0.001', 1],
    ['0,29', 290],
    ['2.500', 2500],
    ['999999999.999', 999999999999],
  ] as const)('parses %s as exact milliunits', (input, expected) =>
    expect(parseMilliunits(input)).toBe(expected),
  );
  it.each([
    '-1',
    '1.2345',
    '1,234.5',
    'NaN',
    'Infinity',
    '1e3',
    '',
    '1000000000',
  ])('rejects unsupported quantity %s', (input) => {
    expect(() => parseMilliunits(input)).toThrow(OperationError);
  });
  it.each(['binary', 'quantity'] as const)(
    'validates all schedules for %s',
    async (measurementMode) => {
      const repository = repositoryStub();
      const actions = createHabitActions(repository);
      const measurement =
        measurementMode === 'binary'
          ? { measurementMode }
          : { measurementMode, targetMilliunits: 20000, unitLabel: 'pages' };
      for (const schedule of [
        { scheduleType: 'daily' },
        { scheduleType: 'weekdays', weekdayMask: 17 },
        { scheduleType: 'weekly', weeklyTarget: 3 },
      ])
        await actions.create({
          id: habitId,
          name: ' Reading ',
          ...measurement,
          ...schedule,
        });
      expect(repository.create).toHaveBeenCalledTimes(3);
      expect(repository.create.mock.calls[0]?.[0].name).toBe('Reading');
    },
  );
  it('rejects invalid definitions before calling persistence', () => {
    const repository = repositoryStub();
    const actions = createHabitActions(repository);
    for (const input of [
      { name: '' },
      { name: 'x'.repeat(101) },
      { measurementMode: 'quantity', targetMilliunits: 0, unitLabel: 'pages' },
      { scheduleType: 'weekdays', weekdayMask: 0 },
      { scheduleType: 'weekly', weeklyTarget: 8 },
    ])
      expect(() =>
        actions.create({
          id: habitId,
          name: 'Read',
          measurementMode: 'binary',
          scheduleType: 'daily',
          ...input,
        }),
      ).toThrow(OperationError);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('requires revisions for replacement and positive contributions', async () => {
    const repository = repositoryStub();
    const actions = createHabitActions(repository);
    const base = { operationId, habitId, date: '2026-10-21' };
    expect(() =>
      actions.record({ ...base, kind: 'set_total', amountMilliunits: 0 }),
    ).toThrow(OperationError);
    expect(() =>
      actions.record({ ...base, kind: 'add_amount', amountMilliunits: 0 }),
    ).toThrow(OperationError);
    await actions.record({
      ...base,
      kind: 'set_total',
      amountMilliunits: 0,
      expectedRevision: 1,
    });
    expect(repository.record).toHaveBeenCalledTimes(1);
  });
  it('requires explicit valid zone and week selection without a device fallback', async () => {
    const initializeHabitCalendar = jest.fn(async () => undefined);
    const repository = {
      initializeHabitCalendar,
    } as unknown as ProfileRepository;
    const actions = createCalendarActions(repository);
    for (const input of [
      { timeZone: '', weekStartDay: 1 },
      { timeZone: 'Invalid/Zone', weekStartDay: 1 },
      { timeZone: 'America/Bogota', weekStartDay: null },
      { timeZone: 'UTC', weekStartDay: 2 },
    ])
      expect(() => actions.initialize(input)).toThrow(OperationError);
    expect(initializeHabitCalendar).not.toHaveBeenCalled();
    await actions.initialize({ timeZone: 'America/Bogota', weekStartDay: 7 });
    expect(initializeHabitCalendar).toHaveBeenCalledWith({
      timeZone: 'America/Bogota',
      weekStartDay: 7,
    });
  });
});
