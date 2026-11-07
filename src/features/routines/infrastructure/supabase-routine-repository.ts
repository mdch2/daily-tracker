import { z } from 'zod';
import type { BackendClient } from '@/infrastructure/supabase/client';
import { mapOperationError } from '@/infrastructure/supabase/map-operation-error';
import { OperationError } from '@/shared/domain/operation-error';
import type {
  Routine,
  RoutineConfiguration,
  RoutineDayRecord,
  RoutineRepository,
} from '../domain/routine';

const stamp = z.iso.datetime({ offset: true });
const stepRow = z
  .object({
    id: z.uuid(),
    kind: z.enum(['own', 'habit']),
    required: z.boolean(),
    position: z.number().int().min(0).max(29),
    title: z.string().trim().min(1).max(100).nullable(),
    habit_id: z.uuid().nullable(),
  })
  .refine((row) =>
    row.kind === 'own'
      ? row.title !== null && row.habit_id === null
      : row.habit_id !== null && row.title === null,
  );
const definitionRow = z
  .object({
    id: z.uuid(),
    routine_id: z.uuid(),
    user_id: z.uuid(),
    effective_from: z.iso.date(),
    schedule_type: z.enum(['daily', 'weekdays']),
    weekday_mask: z.number().int().min(1).max(127).nullable(),
    time_zone: z.string().min(1),
    week_start_day: z.union([z.literal(1), z.literal(7)]),
    steps: z.array(stepRow).min(1).max(30),
  })
  .refine(
    (row) =>
      (row.schedule_type === 'daily'
        ? row.weekday_mask === null
        : row.weekday_mask !== null) && row.steps.some((step) => step.required),
  );
const routineRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  start_date: z.iso.date(),
  archived_at: stamp.nullable(),
  created_at: stamp,
  updated_at: stamp,
  definitions: z.array(definitionRow).min(1),
});
const dayRow = z.object({
  routine_id: z.uuid(),
  definition_id: z.uuid(),
  step_id: z.uuid(),
  occurrence_date: z.iso.date(),
  completed: z.boolean(),
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  recorded_at: stamp,
  updated_at: stamp,
});
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new OperationError('service');
  return parsed.data;
}
function routine(row: z.infer<typeof routineRow>): Routine {
  const definitions = [...row.definitions].sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from),
  );
  const first = definitions[0]!;
  const identities = new Map<string, string>();
  if (
    first.effective_from !== row.start_date ||
    new Set(definitions.map((value) => value.effective_from)).size !==
      definitions.length
  )
    throw new OperationError('service');
  for (const definition of definitions) {
    const steps = [...definition.steps].sort((a, b) => a.position - b.position);
    const habits = steps.flatMap((step) =>
      step.habit_id ? [step.habit_id] : [],
    );
    if (
      definition.routine_id !== row.id ||
      definition.user_id !== row.user_id ||
      definition.time_zone !== first.time_zone ||
      definition.week_start_day !== first.week_start_day ||
      steps.some((step, index) => step.position !== index) ||
      new Set(steps.map((step) => step.id)).size !== steps.length ||
      new Set(habits).size !== habits.length
    )
      throw new OperationError('service');
    for (const step of steps) {
      const identity = step.kind + (step.habit_id ?? '');
      if (identities.has(step.id) && identities.get(step.id) !== identity)
        throw new OperationError('service');
      identities.set(step.id, identity);
    }
  }
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    definitions: definitions.map((definition) => ({
      id: definition.id,
      effectiveFrom: definition.effective_from,
      timeZone: definition.time_zone,
      weekStartDay: definition.week_start_day,
      ...(definition.schedule_type === 'daily'
        ? { scheduleType: 'daily' as const }
        : {
            scheduleType: 'weekdays' as const,
            weekdayMask: definition.weekday_mask!,
          }),
      steps: [...definition.steps]
        .sort((a, b) => a.position - b.position)
        .map((step) => ({
          id: step.id,
          required: step.required,
          ...(step.kind === 'own'
            ? { kind: 'own' as const, title: step.title! }
            : { kind: 'habit' as const, habitId: step.habit_id! }),
        })),
    })),
  };
}
function configuration(input: RoutineConfiguration) {
  return {
    p_schedule_type: input.scheduleType,
    ...(input.scheduleType === 'weekdays'
      ? { p_weekday_mask: input.weekdayMask }
      : {}),
    p_steps: input.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      required: step.required,
      title: step.kind === 'own' ? step.title : null,
      habit_id: step.kind === 'habit' ? step.habitId : null,
    })),
  };
}
export function createRoutineRepository(
  client: BackendClient,
): RoutineRepository {
  async function read(
    ids: string[] | undefined,
    offset: number,
    archived: boolean,
  ) {
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      (ids && !z.array(z.uuid()).min(1).max(20).safeParse(ids).success)
    )
      throw new OperationError('invalidInput');
    const { data, error } = await client.rpc('get_routines', {
      ...(ids ? { p_ids: ids } : {}),
      p_offset: offset,
      p_archived: archived,
    });
    if (error) throw mapOperationError(error);
    const row = parse(
      z.object({
        routines: z.array(routineRow).max(20),
        has_more: z.boolean(),
      }),
      data,
    );
    if (ids && row.routines.some((value) => !ids.includes(value.id)))
      throw new OperationError('service');
    return { routines: row.routines.map(routine), hasMore: row.has_more };
  }
  return {
    list: (offset, archived) => read(undefined, offset, archived),
    async findById(id) {
      return (await read([id], 0, false)).routines[0] ?? null;
    },
    async readDays(ids, from, to) {
      const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
      if (
        !z.array(z.uuid()).max(10).safeParse(ids).success ||
        !z.iso.date().safeParse(from).success ||
        !z.iso.date().safeParse(to).success ||
        days < 1 ||
        days > 28 ||
        (days > 1 && ids.length !== 1)
      )
        throw new OperationError('invalidInput');
      if (!ids.length) return [];
      const { data, error } = await client
        .from('routine_step_day_records')
        .select('*')
        .in('routine_id', ids)
        .gte('occurrence_date', from)
        .lte('occurrence_date', to);
      if (error) throw mapOperationError(error);
      return parse(z.array(dayRow).max(ids.length * days * 30), data).map(
        (row): RoutineDayRecord => {
          if (
            !ids.includes(row.routine_id) ||
            row.occurrence_date < from ||
            row.occurrence_date > to
          )
            throw new OperationError('service');
          return {
            routineId: row.routine_id,
            definitionId: row.definition_id,
            stepId: row.step_id,
            date: row.occurrence_date,
            completed: row.completed,
            revision: row.revision,
            recordedAt: row.recorded_at,
            updatedAt: row.updated_at,
          };
        },
      );
    },
    async create(input) {
      const { data, error } = await client.rpc('create_routine', {
        p_id: input.id,
        p_name: input.name,
        ...configuration(input),
      });
      if (error) throw mapOperationError(error);
      if (parse(z.uuid(), data) !== input.id)
        throw new OperationError('service');
      return input.id;
    },
    async edit(input) {
      const { data, error } = await client.rpc('edit_routine', {
        p_operation_id: input.operationId,
        p_routine_id: input.routineId,
        p_name: input.name,
        p_expected_updated_at: input.expectedUpdatedAt,
        ...(input.configuration ? configuration(input.configuration) : {}),
      });
      if (error) throw mapOperationError(error);
      const row = parse(
        z.object({
          operation_id: z.uuid(),
          routine_id: z.uuid(),
          updated_at: stamp,
          effective_from: z.iso.date().nullable(),
        }),
        data,
      );
      if (
        row.operation_id !== input.operationId ||
        row.routine_id !== input.routineId
      )
        throw new OperationError('service');
      return { effectiveFrom: row.effective_from };
    },
    async archive(input) {
      const { data, error } = await client.rpc('archive_routine', {
        p_operation_id: input.operationId,
        p_routine_id: input.routineId,
        p_expected_updated_at: input.expectedUpdatedAt,
      });
      if (error) throw mapOperationError(error);
      const row = parse(
        z.object({
          operation_id: z.uuid(),
          routine_id: z.uuid(),
          updated_at: stamp,
        }),
        data,
      );
      if (
        row.operation_id !== input.operationId ||
        row.routine_id !== input.routineId
      )
        throw new OperationError('service');
    },
    async record(input) {
      const { data, error } = await client.rpc('record_routine_step', {
        p_operation_id: input.operationId,
        p_routine_id: input.routineId,
        p_step_id: input.stepId,
        p_occurrence_date: input.date,
        p_completed: input.completed,
        p_expected_revision: input.expectedRevision,
      });
      if (error) throw mapOperationError(error);
      const row = parse(
        z.object({
          operation_id: z.uuid(),
          routine_id: z.uuid(),
          step_id: z.uuid(),
          occurrence_date: z.iso.date(),
          completed: z.boolean(),
          revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
        }),
        data,
      );
      if (
        row.operation_id !== input.operationId ||
        row.routine_id !== input.routineId ||
        row.step_id !== input.stepId ||
        row.occurrence_date !== input.date ||
        row.completed !== input.completed
      )
        throw new OperationError('service');
      return {
        operationId: row.operation_id,
        routineId: row.routine_id,
        stepId: row.step_id,
        date: row.occurrence_date,
        completed: row.completed,
        revision: row.revision,
      };
    },
  };
}
