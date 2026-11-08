import { z } from 'zod';
import { OperationError } from '@/shared/domain/operation-error';
import {
  GOAL_MAX_MILLIUNITS,
  type GoalRepository,
  type CreateGoal,
  type RecordGoalMilestone,
} from '../domain/goal';

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => [...value].length >= min && [...value].length <= max);
const identity = { operationId: z.uuid(), goalId: z.uuid() };
const integer = z.number().int().min(0).max(GOAL_MAX_MILLIUNITS);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const description = text(0, 400)
  .nullable()
  .transform((value) => value || null);
const milestone = z.object({ id: z.uuid(), name: text(1, 100) }).strict();
const base = {
  ...identity,
  name: text(1, 100),
  description,
  reward: description,
  startDate: z.iso.date(),
  deadline: z.iso.date().nullable(),
};
export const createGoalSchema = z
  .union([
    z
      .object({
        ...base,
        mode: z.literal('amount'),
        progressSource: z.literal('manual'),
        unitLabel: text(1, 30),
        targetMilliunits: integer.positive(),
      })
      .strict(),
    z
      .object({
        ...base,
        mode: z.literal('milestones'),
        progressSource: z.literal('manual'),
        milestones: z.array(milestone).min(1).max(30),
      })
      .strict(),
    z
      .object({
        ...base,
        mode: z.literal('amount'),
        progressSource: z.literal('habit'),
        habitId: z.uuid(),
        linkedMetric: z.enum(['amount', 'completed_days']),
        targetMilliunits: integer.positive(),
      })
      .strict(),
    z
      .object({
        ...base,
        mode: z.literal('milestones'),
        progressSource: z.literal('habit'),
        habitId: z.uuid(),
        linkedMetric: z.enum(['amount', 'completed_days']),
        milestones: z
          .array(milestone.extend({ thresholdMilliunits: integer.positive() }))
          .min(1)
          .max(30),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (value.deadline && value.deadline < value.startDate)
      ctx.addIssue({ code: 'custom', message: 'Invalid deadline' });
    if ('milestones' in value) {
      if (
        new Set(value.milestones.map((item) => item.id)).size !==
        value.milestones.length
      )
        ctx.addIssue({ code: 'custom', message: 'Duplicate milestones' });
      if (
        value.progressSource === 'habit' &&
        value.milestones.some(
          (item, index) =>
            item.thresholdMilliunits <=
              (value.milestones[index - 1]?.thresholdMilliunits ?? 0) ||
            (value.linkedMetric === 'completed_days' &&
              item.thresholdMilliunits % 1000 !== 0),
        )
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid thresholds' });
    }
    if (
      value.progressSource === 'habit' &&
      value.linkedMetric === 'completed_days' &&
      'targetMilliunits' in value &&
      value.targetMilliunits % 1000 !== 0
    )
      ctx.addIssue({ code: 'custom', message: 'Whole days required' });
  });
export const editGoalSchema = z
  .object({
    ...identity,
    expectedVersion: revision.positive(),
    name: text(1, 100),
    description,
    reward: description,
    deadline: z.iso.date().nullable(),
    targetMilliunits: integer.positive().nullable(),
  })
  .strict();
export const archiveGoalSchema = z
  .object({ ...identity, expectedVersion: revision.positive() })
  .strict();
export const recordGoalAmountSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...identity,
      date: z.iso.date(),
      action: z.literal('add'),
      amountMilliunits: integer.positive(),
    })
    .strict(),
  z
    .object({
      ...identity,
      date: z.iso.date(),
      action: z.literal('set'),
      amountMilliunits: integer,
      expectedRevision: revision,
    })
    .strict(),
]);
export const recordGoalMilestoneSchema = z.discriminatedUnion('completed', [
  z
    .object({
      ...identity,
      milestoneId: z.uuid(),
      completed: z.literal(true),
      completionDate: z.iso.date(),
      expectedRevision: revision,
    })
    .strict(),
  z
    .object({
      ...identity,
      milestoneId: z.uuid(),
      completed: z.literal(false),
      completionDate: z.null(),
      expectedRevision: revision,
    })
    .strict(),
]);
function validated<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new OperationError('invalidInput');
  return result.data;
}
export function createGoalActions(repository: GoalRepository) {
  return {
    create: (input: unknown) =>
      repository.create(validated<CreateGoal>(createGoalSchema, input)),
    edit: (input: unknown) => repository.edit(validated(editGoalSchema, input)),
    archive: (input: unknown) =>
      repository.archive(validated(archiveGoalSchema, input)),
    recordAmount: (input: unknown) =>
      repository.recordAmount(validated(recordGoalAmountSchema, input)),
    recordMilestone: (input: unknown) =>
      repository.recordMilestone(
        validated<RecordGoalMilestone>(recordGoalMilestoneSchema, input),
      ),
  };
}
