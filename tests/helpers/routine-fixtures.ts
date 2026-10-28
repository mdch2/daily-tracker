import type {
  Routine,
  RoutineDayRecord,
  RoutineRepository,
} from '@/features/routines/domain/routine';
import { habitId, definitionId } from './habit-fixtures';

export const routineId = '27000000-0000-4000-8000-000000000011';
export const ownStepId = '27000000-0000-4000-8000-000000000012';
export const linkedStepId = '27000000-0000-4000-8000-000000000013';
export const optionalStepId = '27000000-0000-4000-8000-000000000014';
export const routine: Routine = {
  id: routineId,
  name: 'Synthetic morning',
  startDate: '2026-10-01',
  archivedAt: null,
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
  definitions: [
    {
      id: definitionId,
      effectiveFrom: '2026-10-01',
      timeZone: 'America/Bogota',
      weekStartDay: 1,
      scheduleType: 'daily',
      steps: [
        {
          id: ownStepId,
          kind: 'own',
          title: 'Prepare my desk',
          required: true,
        },
        { id: linkedStepId, kind: 'habit', habitId, required: true },
        {
          id: optionalStepId,
          kind: 'own',
          title: 'Prepare clothes',
          required: false,
        },
      ],
    },
  ],
};
export function ownDay(
  date = '2026-10-21',
  completed = true,
  revision = 1,
): RoutineDayRecord {
  return {
    routineId,
    definitionId,
    stepId: ownStepId,
    date,
    completed,
    revision,
    recordedAt: '2026-10-21T12:00:00Z',
    updatedAt: '2026-10-21T12:00:00Z',
  };
}
export function routineRepositoryStub(): jest.Mocked<RoutineRepository> {
  return {
    list: jest.fn<
      ReturnType<RoutineRepository['list']>,
      Parameters<RoutineRepository['list']>
    >(async () => ({ routines: [], hasMore: false })),
    findById: jest.fn<
      ReturnType<RoutineRepository['findById']>,
      Parameters<RoutineRepository['findById']>
    >(async () => routine),
    readDays: jest.fn<
      ReturnType<RoutineRepository['readDays']>,
      Parameters<RoutineRepository['readDays']>
    >(async () => []),
    create: jest.fn(async (input) => input.id),
    edit: jest.fn<
      ReturnType<RoutineRepository['edit']>,
      Parameters<RoutineRepository['edit']>
    >(async () => ({
      effectiveFrom: '2026-10-26' as string | null,
    })),
    archive: jest.fn<
      ReturnType<RoutineRepository['archive']>,
      Parameters<RoutineRepository['archive']>
    >(async () => undefined),
    record: jest.fn(async (input) => ({
      operationId: input.operationId,
      routineId: input.routineId,
      stepId: input.stepId,
      date: input.date,
      completed: input.completed,
      revision: input.expectedRevision + 1,
    })),
  };
}
