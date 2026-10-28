import type { Habit, HabitDayRecord } from '@/features/habits/domain/habit';

export type RoutineSchedule =
  { scheduleType: 'daily' } | { scheduleType: 'weekdays'; weekdayMask: number };
export type RoutineStep = { id: string; required: boolean } & (
  { kind: 'own'; title: string } | { kind: 'habit'; habitId: string }
);
export type RoutineConfiguration = RoutineSchedule & { steps: RoutineStep[] };
export type RoutineDefinition = RoutineConfiguration & {
  id: string;
  effectiveFrom: string;
  timeZone: string;
  weekStartDay: 1 | 7;
};
export type Routine = {
  id: string;
  name: string;
  startDate: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  definitions: RoutineDefinition[];
};
export type CreateRoutine = RoutineConfiguration & { id: string; name: string };
export type EditRoutine = {
  operationId: string;
  routineId: string;
  expectedUpdatedAt: string;
  name: string;
  configuration?: RoutineConfiguration | undefined;
};
export type ArchiveRoutine = Omit<EditRoutine, 'name' | 'configuration'>;
export type RecordOwnStep = {
  operationId: string;
  routineId: string;
  stepId: string;
  date: string;
  completed: boolean;
  expectedRevision: number;
};
export type RoutineDayRecord = {
  routineId: string;
  definitionId: string;
  stepId: string;
  date: string;
  completed: boolean;
  revision: number;
  recordedAt: string;
  updatedAt: string;
};
export type RoutineWindow = {
  records: RoutineDayRecord[];
  habits: Habit[];
  habitRecords: HabitDayRecord[];
};
export interface RoutineRepository {
  list(
    offset: number,
    archived: boolean,
  ): Promise<{ routines: Routine[]; hasMore: boolean }>;
  findById(id: string): Promise<Routine | null>;
  readDays(
    ids: string[],
    from: string,
    to: string,
  ): Promise<RoutineDayRecord[]>;
  create(input: CreateRoutine): Promise<string>;
  edit(input: EditRoutine): Promise<{ effectiveFrom: string | null }>;
  archive(input: ArchiveRoutine): Promise<void>;
  record(input: RecordOwnStep): Promise<{
    operationId: string;
    routineId: string;
    stepId: string;
    date: string;
    completed: boolean;
    revision: number;
  }>;
}
