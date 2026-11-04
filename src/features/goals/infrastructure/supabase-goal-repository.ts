import { z } from 'zod';
import type { BackendClient } from '@/infrastructure/supabase/client';
import type { Json } from '@/infrastructure/supabase/database.types';
import { mapOperationError } from '@/infrastructure/supabase/map-operation-error';
import { OperationError } from '@/shared/domain/operation-error';
import {
  GOAL_MAX_MILLIUNITS,
  goalStates,
  type GoalRead,
  type GoalRepository,
  type GoalReceipt,
} from '../domain/goal';
import { goalPercentage, goalState } from '../domain/goal-rules';

const uuid = z.uuid();
const stamp = z.iso.datetime({ offset: true });
const milli = z.number().int().min(0).max(GOAL_MAX_MILLIUNITS);
const rev = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const label = (max: number) =>
  z
    .string()
    .refine(
      (value) =>
        value.trim() === value &&
        [...value].length >= 1 &&
        [...value].length <= max,
    );
const metric = z.enum(['amount', 'completed_days']);
const kind = z.enum([
  'create',
  'edit',
  'archive',
  'amount_add',
  'amount_set',
  'milestone_set',
]);
const milestone = z
  .object({
    id: uuid,
    name: label(100),
    position: z.number().int().min(0).max(29),
    threshold_milliunits: milli.positive().nullable(),
  })
  .strict();
const definition = z
  .object({
    id: uuid,
    name: label(100),
    description: label(400).nullable(),
    mode: z.enum(['amount', 'milestones']),
    progress_source: z.enum(['manual', 'habit']),
    start_date: z.iso.date(),
    deadline: z.iso.date().nullable(),
    time_zone: z.string().min(1),
    created_at: stamp,
    updated_at: stamp,
    archived_at: stamp.nullable(),
    archived_on: z.iso.date().nullable(),
    version: rev.positive(),
    unit_label: label(30).nullable(),
    target_milliunits: milli.positive().nullable(),
    habit_id: uuid.nullable(),
    linked_metric: metric.nullable(),
    milestones: z.array(milestone).max(30),
  })
  .strict();
const progress = z.discriminatedUnion('available', [
  z
    .object({
      available: z.literal(true),
      accumulated_milliunits: milli.nullable(),
      completed_milestones: rev.max(30).nullable(),
      total_milestones: rev.max(30).nullable(),
      percentage: z.number().int().min(0).max(100),
    })
    .strict(),
  z
    .object({
      available: z.literal(false),
      error: z.literal('amountLimit'),
      accumulated_milliunits: z.null(),
      completed_milestones: z.null(),
      total_milestones: z.null(),
      percentage: z.null(),
    })
    .strict(),
]);
const source = z
  .object({
    habit_id: uuid,
    name: label(100),
    measurement_mode: z.enum(['binary', 'quantity']),
    linked_metric: metric,
    unit_label: label(30).nullable(),
  })
  .strict();
const milestoneState = z.union([
  z
    .object({
      id: uuid,
      completed: z.boolean(),
      revision: rev,
      completion_date: z.iso.date().nullable(),
    })
    .strict(),
  z
    .object({
      id: uuid,
      completed: z.boolean(),
      threshold_milliunits: milli.positive(),
    })
    .strict(),
]);
const read = z
  .object({
    definition,
    state: z.enum(goalStates),
    progress,
    source: source.nullable(),
    milestone_states: z.array(milestoneState).max(30),
  })
  .strict();
const context = z
  .object({
    read_at: stamp,
    today: z.iso.date(),
    time_zone: z.string().min(1),
    next_day_at: stamp,
  })
  .strict()
  .refine((value) => Date.parse(value.next_day_at) > Date.parse(value.read_at));
const counts = z
  .object({
    archived: rev,
    scheduled: rev,
    achieved: rev,
    overdue: rev,
    in_progress: rev,
  })
  .strict();
const contribution = z
  .object({
    date: z.iso.date(),
    in_window: z.boolean(),
    recorded: z.boolean(),
    revision: rev.positive().nullable(),
    amount_milliunits: milli.nullable(),
    binary_value: z.boolean().nullable(),
    source_definition_id: uuid.nullable(),
    completed: z.boolean(),
    contribution_milliunits: milli.nullable(),
  })
  .strict()
  .refine((row) =>
    row.recorded
      ? row.in_window &&
        row.revision !== null &&
        row.contribution_milliunits !== null &&
        (row.amount_milliunits !== null) !== (row.binary_value !== null)
      : row.revision === null &&
        row.amount_milliunits === null &&
        row.binary_value === null &&
        row.contribution_milliunits === null &&
        !row.completed,
  );
const auditValue = z
  .object({
    goal_id: uuid,
    name: label(100),
    description: label(400).nullable(),
    start_date: z.iso.date(),
    deadline: z.iso.date().nullable(),
    mode: z.enum(['amount', 'milestones']),
    progress_source: z.enum(['manual', 'habit']),
    target_milliunits: milli.positive().nullable(),
    unit_label: label(30).nullable(),
    habit_id: uuid.nullable(),
    linked_metric: metric.nullable(),
    milestones: z.array(milestone.omit({ position: true })).max(30),
    version: rev.positive(),
    effective_at: stamp,
    archived_at: stamp.nullable(),
    date: z.iso.date(),
    amount_milliunits: milli,
    revision: rev.positive(),
    milestone_id: uuid,
    completed: z.boolean(),
    completion_date: z.iso.date().nullable(),
  })
  .partial()
  .strict();
const event = z
  .object({
    sequence: rev.positive(),
    operation_id: uuid,
    kind,
    accepted_at: stamp,
    date: z.iso.date().nullable(),
    before: auditValue.nullable(),
    after: auditValue,
  })
  .strict();
const receipt = z
  .object({
    operation_id: uuid,
    goal_id: uuid,
    kind,
    accepted_at: stamp,
    goal_version: rev.positive(),
    event_sequence: rev.positive(),
    date: z.iso.date().optional(),
    amount_milliunits: milli.optional(),
    revision: rev.positive().optional(),
    milestone_id: uuid.optional(),
    completed: z.boolean().optional(),
    completion_date: z.iso.date().nullable().optional(),
    archived_at: stamp.optional(),
    archived_on: z.iso.date().optional(),
  })
  .strict();
function parsed<T>(schema: z.ZodType<T>, value: unknown, input = false): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new OperationError(input ? 'invalidInput' : 'service');
  return result.data;
}
function requireResult(condition: boolean): asserts condition {
  if (!condition) throw new OperationError('service');
}
function mappedContext(row: z.infer<typeof context>) {
  return {
    readAt: row.read_at,
    today: row.today,
    timeZone: row.time_zone,
    nextDayAt: row.next_day_at,
  };
}
function mapped(
  row: z.infer<typeof read>,
  ctx: z.infer<typeof context>,
): GoalRead {
  const d = row.definition;
  const g = {
    id: d.id,
    name: d.name,
    description: d.description,
    mode: d.mode,
    progressSource: d.progress_source,
    startDate: d.start_date,
    deadline: d.deadline,
    timeZone: d.time_zone,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    archivedAt: d.archived_at,
    archivedOn: d.archived_on,
    version: d.version,
    unitLabel: d.unit_label,
    targetMilliunits: d.target_milliunits,
    habitId: d.habit_id,
    linkedMetric: d.linked_metric,
    milestones: d.milestones.map((item) => ({
      id: item.id,
      name: item.name,
      position: item.position,
      thresholdMilliunits: item.threshold_milliunits,
    })),
  };
  requireResult(
    d.time_zone === ctx.time_zone &&
      (d.deadline === null || d.deadline >= d.start_date) &&
      (d.archived_at === null) === (d.archived_on === null),
  );
  requireResult(
    new Set(d.milestones.map((item) => item.id)).size === d.milestones.length &&
      d.milestones.every((item, index) => item.position === index),
  );
  requireResult(
    d.mode === 'amount'
      ? d.target_milliunits !== null &&
          !d.milestones.length &&
          !row.milestone_states.length
      : d.target_milliunits === null &&
          d.milestones.length > 0 &&
          d.milestones.length === row.milestone_states.length,
  );
  if (d.progress_source === 'manual') {
    requireResult(
      row.source === null &&
        d.habit_id === null &&
        d.linked_metric === null &&
        (d.mode === 'amount' ? d.unit_label !== null : d.unit_label === null),
    );
    requireResult(
      d.milestones.every((item) => item.threshold_milliunits === null),
    );
  } else {
    requireResult(
      row.source !== null &&
        row.source.habit_id === d.habit_id &&
        row.source.linked_metric === d.linked_metric &&
        row.source.unit_label === d.unit_label,
    );
    requireResult(
      d.linked_metric === 'amount'
        ? row.source.measurement_mode === 'quantity' && d.unit_label !== null
        : d.unit_label === null,
    );
    requireResult(
      d.milestones.every(
        (item, index) =>
          item.threshold_milliunits !== null &&
          item.threshold_milliunits >
            (d.milestones[index - 1]?.threshold_milliunits ?? 0) &&
          (d.linked_metric !== 'completed_days' ||
            item.threshold_milliunits % 1000 === 0),
      ),
    );
    if (d.linked_metric === 'completed_days' && d.target_milliunits !== null)
      requireResult(d.target_milliunits % 1000 === 0);
  }
  for (const [index, item] of row.milestone_states.entries()) {
    requireResult(item.id === d.milestones[index]?.id);
    if (d.progress_source === 'manual') {
      requireResult(
        'revision' in item &&
          item.completed === (item.completion_date !== null),
      );
      if (item.completion_date)
        requireResult(
          item.completion_date >= d.start_date &&
            item.completion_date <= ctx.today,
        );
    } else {
      requireResult(
        'threshold_milliunits' in item &&
          item.threshold_milliunits ===
            d.milestones[index]?.threshold_milliunits,
      );
      if (row.progress.available)
        requireResult(
          item.completed ===
            (row.progress.accumulated_milliunits ?? -1) >=
              item.threshold_milliunits,
        );
    }
  }
  let achieved: boolean;
  if (row.progress.available) {
    const p = row.progress;
    requireResult(
      d.mode === 'amount' || d.progress_source === 'habit'
        ? p.accumulated_milliunits !== null
        : p.accumulated_milliunits === null,
    );
    if (d.linked_metric === 'completed_days')
      requireResult((p.accumulated_milliunits ?? -1) % 1000 === 0);
    const numerator =
      d.mode === 'amount'
        ? p.accumulated_milliunits!
        : row.milestone_states.filter((item) => item.completed).length;
    const denominator =
      d.mode === 'amount' ? d.target_milliunits! : d.milestones.length;
    requireResult(
      d.mode === 'amount'
        ? p.completed_milestones === null && p.total_milestones === null
        : p.completed_milestones === numerator &&
            p.total_milestones === denominator,
    );
    requireResult(p.percentage === goalPercentage(numerator, denominator));
    achieved = numerator >= denominator;
  } else {
    requireResult(d.progress_source === 'habit');
    achieved = true;
  }
  requireResult(row.state === goalState(g, ctx.today, achieved));
  return {
    definition: g,
    state: row.state,
    progress: row.progress.available
      ? {
          available: true,
          accumulatedMilliunits: row.progress.accumulated_milliunits,
          completedMilestones: row.progress.completed_milestones,
          totalMilestones: row.progress.total_milestones,
          percentage: row.progress.percentage,
        }
      : { available: false, error: 'amountLimit' },
    milestoneStates: row.milestone_states.map((item) => ({
      id: item.id,
      completed: item.completed,
      ...('revision' in item
        ? { revision: item.revision, completionDate: item.completion_date }
        : { thresholdMilliunits: item.threshold_milliunits }),
    })),
    source: row.source
      ? {
          habitId: row.source.habit_id,
          name: row.source.name,
          measurementMode: row.source.measurement_mode,
          linkedMetric: row.source.linked_metric,
          unitLabel: row.source.unit_label,
        }
      : null,
  };
}
type Rpc =
  | 'get_goals'
  | 'get_goal'
  | 'get_goal_contributions'
  | 'get_goal_history'
  | 'create_goal'
  | 'edit_goal'
  | 'archive_goal'
  | 'record_goal_amount'
  | 'record_goal_milestone';
export function createGoalRepository(client: BackendClient): GoalRepository {
  async function call(name: Rpc, input: Json) {
    const { data, error } = await client.rpc(name, { p_input: input });
    if (error) throw mapOperationError(error);
    return data;
  }
  async function write(
    name: Rpc,
    input: Json & { operation_id: string; goal_id: string },
    expectedKind: GoalReceipt['kind'],
  ): Promise<GoalReceipt> {
    const r = parsed(receipt, await call(name, input));
    requireResult(
      r.operation_id === input.operation_id &&
        r.goal_id === input.goal_id &&
        r.kind === expectedKind,
    );
    return {
      operationId: r.operation_id,
      goalId: r.goal_id,
      kind: r.kind,
      acceptedAt: r.accepted_at,
      goalVersion: r.goal_version,
      eventSequence: r.event_sequence,
      ...('date' in r ? { date: r.date! } : {}),
      ...('amount_milliunits' in r
        ? { amountMilliunits: r.amount_milliunits! }
        : {}),
      ...('revision' in r ? { revision: r.revision! } : {}),
      ...('milestone_id' in r ? { milestoneId: r.milestone_id! } : {}),
      ...('completed' in r ? { completed: r.completed! } : {}),
      ...('completion_date' in r ? { completionDate: r.completion_date! } : {}),
      ...('archived_at' in r ? { archivedAt: r.archived_at! } : {}),
      ...('archived_on' in r ? { archivedOn: r.archived_on! } : {}),
    };
  }
  return {
    async list(status, cursor) {
      parsed(z.enum(goalStates).nullable(), status, true);
      parsed(z.string().max(2048).nullable(), cursor, true);
      const r = parsed(
        z
          .object({
            context,
            goals: z.array(read).max(20),
            counts,
            next_cursor: z.string().max(2048).nullable(),
          })
          .strict(),
        await call('get_goals', { status, cursor }),
      );
      const goals = r.goals.map((item) => mapped(item, r.context));
      requireResult(
        new Set(goals.map((item) => item.definition.id)).size ===
          goals.length &&
          goals.every((item) => status === null || item.state === status),
      );
      requireResult(
        goalStates.every(
          (value) =>
            r.counts[value] >=
            goals.filter((item) => item.state === value).length,
        ) &&
          (r.next_cursor === null || goals.length === 20),
      );
      return {
        context: mappedContext(r.context),
        goals,
        counts: r.counts,
        nextCursor: r.next_cursor,
      };
    },
    async findById(id) {
      parsed(uuid, id, true);
      const r = parsed(
        z.object({ context, goal: read.nullable() }).strict(),
        await call('get_goal', { goal_id: id }),
      );
      requireResult(r.goal === null || r.goal.definition.id === id);
      return {
        context: mappedContext(r.context),
        goal: r.goal ? mapped(r.goal, r.context) : null,
      };
    },
    async readContributions(id, from, to) {
      parsed(uuid, id, true);
      parsed(z.iso.date(), from, true);
      parsed(z.iso.date(), to, true);
      const size = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
      if (size < 1 || size > 31) throw new OperationError('invalidInput');
      const r = parsed(
        z.object({ context, days: z.array(contribution).max(31) }).strict(),
        await call('get_goal_contributions', { goal_id: id, from, to }),
      );
      requireResult(
        r.days.length === size &&
          r.days.every(
            (item, index) =>
              item.date ===
              new Date(Date.parse(from) + index * 86400000)
                .toISOString()
                .slice(0, 10),
          ),
      );
      return {
        context: mappedContext(r.context),
        days: r.days.map((item) => ({
          date: item.date,
          inWindow: item.in_window,
          recorded: item.recorded,
          revision: item.revision,
          amountMilliunits: item.amount_milliunits,
          binaryValue: item.binary_value,
          sourceDefinitionId: item.source_definition_id,
          completed: item.completed,
          contributionMilliunits: item.contribution_milliunits,
        })),
      };
    },
    async readHistory(id, beforeSequence, upToSequence) {
      parsed(uuid, id, true);
      parsed(rev.positive().nullable(), beforeSequence, true);
      parsed(rev.positive().nullable(), upToSequence, true);
      const r = parsed(
        z
          .object({
            context,
            events: z.array(event).max(20),
            up_to_sequence: rev.positive(),
            next_before_sequence: rev.positive().nullable(),
          })
          .strict(),
        await call('get_goal_history', {
          goal_id: id,
          before_sequence: beforeSequence,
          up_to_sequence: upToSequence,
        }),
      );
      requireResult(
        (upToSequence === null || upToSequence === r.up_to_sequence) &&
          r.events.every(
            (item, index) =>
              item.sequence <= r.up_to_sequence &&
              (beforeSequence === null || item.sequence < beforeSequence) &&
              (index === 0 || item.sequence < r.events[index - 1]!.sequence),
          ),
      );
      requireResult(
        r.next_before_sequence === null ||
          (r.events.length === 20 &&
            r.next_before_sequence === r.events.at(-1)?.sequence),
      );
      return {
        context: mappedContext(r.context),
        upToSequence: r.up_to_sequence,
        nextBeforeSequence: r.next_before_sequence,
        events: r.events.map((item) => ({
          sequence: item.sequence,
          operationId: item.operation_id,
          kind: item.kind,
          acceptedAt: item.accepted_at,
          date: item.date,
          before: item.before,
          after: item.after,
        })),
      };
    },
    async create(input) {
      const data = {
        operation_id: input.operationId,
        goal_id: input.goalId,
        name: input.name,
        description: input.description,
        start_date: input.startDate,
        deadline: input.deadline,
        mode: input.mode,
        progress_source: input.progressSource,
        ...(input.progressSource === 'habit'
          ? { habit_id: input.habitId, linked_metric: input.linkedMetric }
          : input.mode === 'amount'
            ? { unit_label: input.unitLabel }
            : {}),
        ...(input.mode === 'amount'
          ? { target_milliunits: input.targetMilliunits }
          : {
              milestones: input.milestones.map((item) => ({
                id: item.id,
                name: item.name,
                ...('thresholdMilliunits' in item
                  ? { threshold_milliunits: item.thresholdMilliunits }
                  : {}),
              })),
            }),
      };
      const r = await write('create_goal', data, 'create');
      requireResult(r.goalVersion === 1);
      return r;
    },
    async edit(input) {
      const r = await write(
        'edit_goal',
        {
          operation_id: input.operationId,
          goal_id: input.goalId,
          expected_version: input.expectedVersion,
          name: input.name,
          description: input.description,
          deadline: input.deadline,
          target_milliunits: input.targetMilliunits,
        },
        'edit',
      );
      requireResult(r.goalVersion === input.expectedVersion + 1);
      return r;
    },
    async archive(input) {
      const r = await write(
        'archive_goal',
        {
          operation_id: input.operationId,
          goal_id: input.goalId,
          expected_version: input.expectedVersion,
        },
        'archive',
      );
      requireResult(
        r.goalVersion === input.expectedVersion + 1 &&
          r.archivedAt !== undefined &&
          r.archivedOn !== undefined,
      );
      return r;
    },
    async recordAmount(input) {
      const r = await write(
        'record_goal_amount',
        {
          operation_id: input.operationId,
          goal_id: input.goalId,
          date: input.date,
          action: input.action,
          amount_milliunits: input.amountMilliunits,
          ...(input.action === 'set'
            ? { expected_revision: input.expectedRevision }
            : {}),
        },
        input.action === 'add' ? 'amount_add' : 'amount_set',
      );
      requireResult(
        r.date === input.date &&
          r.amountMilliunits !== undefined &&
          r.revision !== undefined &&
          (input.action === 'add'
            ? r.amountMilliunits >= input.amountMilliunits
            : r.amountMilliunits === input.amountMilliunits &&
              r.revision === input.expectedRevision + 1),
      );
      return r;
    },
    async recordMilestone(input) {
      const r = await write(
        'record_goal_milestone',
        {
          operation_id: input.operationId,
          goal_id: input.goalId,
          milestone_id: input.milestoneId,
          completed: input.completed,
          completion_date: input.completionDate,
          expected_revision: input.expectedRevision,
        },
        'milestone_set',
      );
      requireResult(
        r.milestoneId === input.milestoneId &&
          r.completed === input.completed &&
          r.completionDate === input.completionDate &&
          r.revision === input.expectedRevision + 1,
      );
      return r;
    },
  };
}
