import { OperationError } from '@/shared/domain/operation-error';
import type { Habit, HabitDayRecord } from '../domain/habit';
import type { HabitRepository } from '../domain/habit-repository';

// Read every page before exposing totals; keep day batches within the adapter's 30-id limit.
export async function readHabitOverview(
  repository: HabitRepository,
  from: string,
  to: string,
) {
  const habits: Habit[] = [];
  for (let offset = 0; ; offset += 30) {
    const page = await repository.list(offset);
    habits.push(...page.habits);
    if (!page.hasMore) break;
    if (!page.habits.length) throw new OperationError('service');
  }
  const records: HabitDayRecord[] = [];
  for (let offset = 0; offset < habits.length; offset += 30) {
    records.push(
      ...(await repository.readDays(
        habits.slice(offset, offset + 30).map((habit) => habit.id),
        from,
        to,
      )),
    );
  }
  return { habits, records };
}
