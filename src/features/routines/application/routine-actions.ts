import { z } from 'zod';
import { OperationError } from '@/shared/domain/operation-error';
import type { RoutineRepository } from '../domain/routine';

const identity = { id: z.uuid(), required: z.boolean() };
export const routineStepSchema = z.discriminatedUnion('kind', [
  z.object({
    ...identity,
    kind: z.literal('own'),
    title: z.string().trim().min(1).max(100),
  }),
  z.object({ ...identity, kind: z.literal('habit'), habitId: z.uuid() }),
]);
export const routineConfigurationSchema = z
  .intersection(
    z.discriminatedUnion('scheduleType', [
      z.object({ scheduleType: z.literal('daily') }),
      z.object({
        scheduleType: z.literal('weekdays'),
        weekdayMask: z.number().int().min(1).max(127),
      }),
    ]),
    z.object({ steps: z.array(routineStepSchema).min(1).max(30) }),
  )
  .superRefine((value, ctx) => {
    const ids = value.steps.map((step) => step.id);
    const habits = value.steps.flatMap((step) =>
      step.kind === 'habit' ? [step.habitId] : [],
    );
    if (
      !value.steps.some((step) => step.required) ||
      new Set(ids).size !== ids.length ||
      new Set(habits).size !== habits.length
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid steps' });
  });
const metadata = {
  operationId: z.uuid(),
  routineId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
};
export const createRoutineSchema = z.intersection(
  z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100) }),
  routineConfigurationSchema,
);
export const editRoutineSchema = z.object({
  ...metadata,
  name: z.string().trim().min(1).max(100),
  configuration: routineConfigurationSchema.optional(),
});
export const recordRoutineSchema = z.object({
  operationId: z.uuid(),
  routineId: z.uuid(),
  stepId: z.uuid(),
  date: z.iso.date(),
  completed: z.boolean(),
  expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
function validated<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new OperationError('invalidInput');
  return parsed.data;
}
export function createRoutineActions(repository: RoutineRepository) {
  return {
    create: (input: unknown) =>
      repository.create(validated(createRoutineSchema, input)),
    edit: (input: unknown) =>
      repository.edit(validated(editRoutineSchema, input)),
    archive: (input: unknown) =>
      repository.archive(validated(z.object(metadata), input)),
    record: (input: unknown) =>
      repository.record(validated(recordRoutineSchema, input)),
  };
}
