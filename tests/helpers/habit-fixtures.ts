import type { Habit, HabitDayRecord } from '@/features/habits/domain/habit';
import type { HabitRepository } from '@/features/habits/domain/habit-repository';

export const habitId = '31000000-0000-4000-8000-000000000001';
export const definitionId = '31000000-0000-4000-8000-000000000002';
export const operationId = '31000000-0000-4000-8000-000000000003';
export const userId = '31000000-0000-4000-8000-000000000004';
export const habit: Habit = {
  id: habitId,
  name: 'Synthetic reading',
  startDate: '2026-10-01',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
  definition: {
    id: definitionId,
    effectiveFrom: '2026-10-01',
    timeZone: 'America/Bogota',
    weekStartDay: 1,
    measurementMode: 'quantity',
    targetMilliunits: 20000,
    unitLabel: 'pages',
    scheduleType: 'daily',
  },
};
export function day(
  date: string,
  amountMilliunits: number | null = 20000,
  revision = 1,
): HabitDayRecord {
  return {
    habitId,
    definitionId,
    date,
    amountMilliunits,
    binaryValue: amountMilliunits === null ? true : null,
    revision,
    recordedAt: '2026-10-21T12:00:00Z',
    updatedAt: '2026-10-21T12:00:00Z',
  };
}
export function repositoryStub(): jest.Mocked<HabitRepository> {
  return {
    list: jest.fn<
      ReturnType<HabitRepository['list']>,
      Parameters<HabitRepository['list']>
    >(async () => ({ habits: [habit], hasMore: false })),
    findById: jest.fn<
      ReturnType<HabitRepository['findById']>,
      Parameters<HabitRepository['findById']>
    >(async () => habit),
    readDays: jest.fn<
      ReturnType<HabitRepository['readDays']>,
      Parameters<HabitRepository['readDays']>
    >(async () => []),
    create: jest.fn(async (input) => input.id),
    rename: jest.fn<
      ReturnType<HabitRepository['rename']>,
      Parameters<HabitRepository['rename']>
    >(async () => undefined),
    edit: jest.fn<
      ReturnType<HabitRepository['edit']>,
      Parameters<HabitRepository['edit']>
    >(async () => ({ effectiveFrom: '2026-10-26' })),
    record: jest.fn(async (input) => ({
      operationId: input.operationId,
      habitId: input.habitId,
      date: input.date,
      revision: 1,
      binaryValue: input.kind === 'set_binary' ? input.binaryValue : null,
      amountMilliunits:
        input.kind === 'set_binary' ? null : input.amountMilliunits,
    })),
  };
}
