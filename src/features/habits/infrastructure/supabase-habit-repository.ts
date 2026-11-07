import { z } from 'zod';
import type { BackendClient } from '@/infrastructure/supabase/client';
import { mapOperationError } from '@/infrastructure/supabase/map-operation-error';
import { OperationError } from '@/shared/domain/operation-error';
import {
  MAX_MILLIUNITS,
  type Habit,
  type HabitDayRecord,
  type HabitDefinition,
} from '../domain/habit';
import type { HabitRepository } from '../domain/habit-repository';

const milliunits = z.number().int().min(0).max(MAX_MILLIUNITS);
const timestamp = z.iso.datetime({ offset: true });
const definitionRow = z
  .object({
    id: z.uuid(),
    habit_id: z.uuid(),
    user_id: z.uuid(),
    effective_from: z.iso.date(),
    time_zone: z.string(),
    week_start_day: z.union([z.literal(1), z.literal(7)]),
    measurement_mode: z.enum(['binary', 'quantity']),
    schedule_type: z.enum(['daily', 'weekdays', 'weekly']),
    target_milliunits: milliunits.min(1).nullable(),
    unit_label: z.string().trim().min(1).max(30).nullable(),
    weekday_mask: z.number().int().min(1).max(127).nullable(),
    weekly_target: z.number().int().min(1).max(7).nullable(),
  })
  .superRefine((row, ctx) => {
    const validMeasurement =
      row.measurement_mode === 'binary'
        ? row.target_milliunits === null && row.unit_label === null
        : row.target_milliunits !== null && row.unit_label !== null;
    const validSchedule =
      row.schedule_type === 'daily'
        ? row.weekday_mask === null && row.weekly_target === null
        : row.schedule_type === 'weekdays'
          ? row.weekday_mask !== null && row.weekly_target === null
          : row.weekly_target !== null && row.weekday_mask === null;
    if (!validMeasurement || !validSchedule)
      ctx.addIssue({ code: 'custom', message: 'Invalid definition' });
  });
const habitRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  name: z.string().min(1).max(100),
  start_date: z.iso.date(),
  created_at: timestamp,
  updated_at: timestamp,
  habit_definitions: z.array(definitionRow).min(1),
});
const dayRow = z
  .object({
    habit_id: z.uuid(),
    definition_id: z.uuid(),
    occurrence_date: z.iso.date(),
    binary_value: z.boolean().nullable(),
    amount_milliunits: milliunits.nullable(),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    recorded_at: timestamp,
    updated_at: timestamp,
  })
  .refine(
    (row) => (row.binary_value !== null) !== (row.amount_milliunits !== null),
  );
const receiptRow = z
  .object({
    operation_id: z.uuid(),
    habit_id: z.uuid(),
    occurrence_date: z.iso.date(),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    binary_value: z.boolean().nullable(),
    amount_milliunits: milliunits.nullable(),
  })
  .refine(
    (row) => (row.binary_value !== null) !== (row.amount_milliunits !== null),
  );

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new OperationError('service');
  return result.data;
}
function toHabit(row: z.infer<typeof habitRow>): Habit {
  const definitions = [...row.habit_definitions].sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from),
  );
  const definition = definitions[0];
  if (
    !definition ||
    definition.habit_id !== row.id ||
    definition.user_id !== row.user_id ||
    definition.effective_from !== row.start_date ||
    new Set(definitions.map((value) => value.effective_from)).size !==
      definitions.length ||
    definitions.some(
      (value) =>
        value.habit_id !== row.id ||
        value.user_id !== row.user_id ||
        value.measurement_mode !== definition.measurement_mode ||
        value.unit_label !== definition.unit_label ||
        value.time_zone !== definition.time_zone ||
        value.week_start_day !== definition.week_start_day,
    )
  )
    throw new OperationError('service');
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    definition: toDefinition(definition),
    definitionHistory: definitions.map(toDefinition),
  };
}
function toDefinition(
  definition: z.infer<typeof definitionRow>,
): HabitDefinition {
  return {
    id: definition.id,
    effectiveFrom: definition.effective_from,
    timeZone: definition.time_zone,
    weekStartDay: definition.week_start_day,
    ...(definition.measurement_mode === 'binary'
      ? { measurementMode: 'binary' as const }
      : {
          measurementMode: 'quantity' as const,
          targetMilliunits: definition.target_milliunits!,
          unitLabel: definition.unit_label!,
        }),
    ...(definition.schedule_type === 'daily'
      ? { scheduleType: 'daily' as const }
      : definition.schedule_type === 'weekdays'
        ? {
            scheduleType: 'weekdays' as const,
            weekdayMask: definition.weekday_mask!,
          }
        : {
            scheduleType: 'weekly' as const,
            weeklyTarget: definition.weekly_target!,
          }),
  };
}
function toDay(row: z.infer<typeof dayRow>): HabitDayRecord {
  return {
    habitId: row.habit_id,
    definitionId: row.definition_id,
    date: row.occurrence_date,
    revision: row.revision,
    binaryValue: row.binary_value,
    amountMilliunits: row.amount_milliunits,
    recordedAt: row.recorded_at,
    updatedAt: row.updated_at,
  };
}
export function createHabitRepository(client: BackendClient): HabitRepository {
  return {
    async list(offset) {
      if (!Number.isSafeInteger(offset) || offset < 0)
        throw new OperationError('invalidInput');
      const { data, error } = await client
        .from('habits')
        .select('*, habit_definitions(*)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 30);
      if (error) throw mapOperationError(error);
      const rows = parse(z.array(habitRow).max(31), data);
      return {
        habits: rows.slice(0, 30).map(toHabit),
        hasMore: rows.length > 30,
      };
    },
    async findById(id) {
      parse(z.uuid(), id);
      const { data, error } = await client
        .from('habits')
        .select('*, habit_definitions(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw mapOperationError(error);
      return data === null ? null : toHabit(parse(habitRow, data));
    },
    async readDays(ids, from, to) {
      parse(z.array(z.uuid()).max(30), ids);
      parse(z.iso.date(), from);
      parse(z.iso.date(), to);
      const dayCount = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
      if (dayCount < 1 || dayCount > 31)
        throw new OperationError('invalidInput');
      if (!ids.length) return [];
      const { data, error } = await client
        .from('habit_day_records')
        .select('*')
        .in('habit_id', ids)
        .gte('occurrence_date', from)
        .lte('occurrence_date', to)
        .order('occurrence_date', { ascending: false });
      if (error) throw mapOperationError(error);
      return parse(z.array(dayRow), data).map(toDay);
    },
    async create(input) {
      const { data, error } = await client.rpc('create_habit', {
        p_id: input.id,
        p_name: input.name,
        p_measurement_mode: input.measurementMode,
        p_schedule_type: input.scheduleType,
        ...(input.measurementMode === 'quantity'
          ? {
              p_target_milliunits: input.targetMilliunits,
              p_unit_label: input.unitLabel,
            }
          : {}),
        ...(input.scheduleType === 'weekdays'
          ? { p_weekday_mask: input.weekdayMask }
          : {}),
        ...(input.scheduleType === 'weekly'
          ? { p_weekly_target: input.weeklyTarget }
          : {}),
      });
      if (error) throw mapOperationError(error);
      if (parse(z.uuid(), data) !== input.id)
        throw new OperationError('service');
      return input.id;
    },
    async edit(input) {
      const { data, error } = await client.rpc('edit_habit', {
        p_operation_id: input.operationId,
        p_habit_id: input.habitId,
        p_name: input.name,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_schedule_type: input.scheduleType,
        ...(input.targetMilliunits === null
          ? {}
          : { p_target_milliunits: input.targetMilliunits }),
        ...(input.scheduleType === 'weekdays'
          ? { p_weekday_mask: input.weekdayMask }
          : {}),
        ...(input.scheduleType === 'weekly'
          ? { p_weekly_target: input.weeklyTarget }
          : {}),
      });
      if (error) throw mapOperationError(error);
      const receipt = parse(
        z.object({
          operation_id: z.uuid(),
          habit_id: z.uuid(),
          updated_at: timestamp,
          effective_from: z.iso.date(),
        }),
        data,
      );
      if (
        receipt.operation_id !== input.operationId ||
        receipt.habit_id !== input.habitId
      )
        throw new OperationError('service');
      return { effectiveFrom: receipt.effective_from };
    },
    async rename(input) {
      const { data, error } = await client.rpc('rename_habit', {
        p_operation_id: input.operationId,
        p_habit_id: input.habitId,
        p_name: input.name,
        p_expected_updated_at: input.expectedUpdatedAt,
      });
      if (error) throw mapOperationError(error);
      const receipt = parse(
        z.object({
          operation_id: z.uuid(),
          habit_id: z.uuid(),
          updated_at: timestamp,
        }),
        data,
      );
      if (
        receipt.operation_id !== input.operationId ||
        receipt.habit_id !== input.habitId
      )
        throw new OperationError('service');
    },
    async record(input) {
      const { data, error } = await client.rpc('record_habit_day', {
        p_operation_id: input.operationId,
        p_habit_id: input.habitId,
        p_occurrence_date: input.date,
        p_kind: input.kind,
        ...(input.kind === 'set_binary'
          ? {
              p_binary_value: input.binaryValue,
              p_expected_revision: input.expectedRevision,
            }
          : input.kind === 'set_total'
            ? {
                p_amount_milliunits: input.amountMilliunits,
                p_expected_revision: input.expectedRevision,
              }
            : { p_amount_milliunits: input.amountMilliunits }),
      });
      if (error) throw mapOperationError(error);
      const row = parse(receiptRow, data);
      if (
        row.operation_id !== input.operationId ||
        row.habit_id !== input.habitId ||
        row.occurrence_date !== input.date
      )
        throw new OperationError('service');
      return {
        operationId: row.operation_id,
        habitId: row.habit_id,
        date: row.occurrence_date,
        revision: row.revision,
        binaryValue: row.binary_value,
        amountMilliunits: row.amount_milliunits,
      };
    },
  };
}
