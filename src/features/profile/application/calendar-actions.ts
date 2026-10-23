import { z } from 'zod';
import type { ProfileRepository } from '../domain/profile-repository';
import { OperationError } from '@/shared/domain/operation-error';

export const initialCalendarSchema = z.object({
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) => {
      if (value !== 'UTC' && !value.includes('/')) return false;
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
  weekStartDay: z.union([z.literal(1), z.literal(7)]),
});

export function createCalendarActions(repository: ProfileRepository) {
  return {
    initialize(input: unknown) {
      const parsed = initialCalendarSchema.safeParse(input);
      if (!parsed.success) throw new OperationError('invalidInput');
      return repository.initializeHabitCalendar(parsed.data);
    },
  };
}
