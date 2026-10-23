import { z } from 'zod';
import { MAX_MILLIUNITS } from '../domain/habit';
import type { HabitRepository } from '../domain/habit-repository';
import { OperationError } from '@/shared/domain/operation-error';

const amount = z.number().int().min(0).max(MAX_MILLIUNITS);
const measurement = z.discriminatedUnion('measurementMode', [
  z.object({ measurementMode: z.literal('binary') }),
  z.object({
    measurementMode: z.literal('quantity'),
    targetMilliunits: amount.min(1),
    unitLabel: z.string().trim().min(1).max(30),
  }),
]);
const schedule = z.discriminatedUnion('scheduleType', [
  z.object({ scheduleType: z.literal('daily') }),
  z.object({
    scheduleType: z.literal('weekdays'),
    weekdayMask: z.number().int().min(1).max(127),
  }),
  z.object({
    scheduleType: z.literal('weekly'),
    weeklyTarget: z.number().int().min(1).max(7),
  }),
]);
export const createHabitSchema = z.intersection(
  z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100) }),
  z.intersection(measurement, schedule),
);
const identity = {
  operationId: z.uuid(),
  habitId: z.uuid(),
  date: z.iso.date(),
};
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const recordHabitSchema = z.discriminatedUnion('kind', [
  z.object({
    ...identity,
    kind: z.literal('set_binary'),
    binaryValue: z.boolean(),
    expectedRevision: revision,
  }),
  z.object({
    ...identity,
    kind: z.literal('add_amount'),
    amountMilliunits: amount.min(1),
  }),
  z.object({
    ...identity,
    kind: z.literal('set_total'),
    amountMilliunits: amount,
    expectedRevision: revision,
  }),
]);

// Input accepts a decimal separator, never grouping/exponents or floating-point multiplication.
export function parseMilliunits(text: string): number {
  const value = text.trim();
  if (!/^\d{1,9}([.,]\d{1,3})?$/.test(value))
    throw new OperationError('invalidInput');
  const [whole = '', fraction = ''] = value.replace(',', '.').split('.');
  const result = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  if (result > MAX_MILLIUNITS) throw new OperationError('amountLimit');
  return result;
}
export function createHabitActions(repository: HabitRepository) {
  return {
    create(input: unknown) {
      const parsed = createHabitSchema.safeParse(input);
      if (!parsed.success) throw new OperationError('invalidInput');
      return repository.create(parsed.data);
    },
    record(input: unknown) {
      const parsed = recordHabitSchema.safeParse(input);
      if (!parsed.success) throw new OperationError('invalidInput');
      return repository.record(parsed.data);
    },
  };
}
