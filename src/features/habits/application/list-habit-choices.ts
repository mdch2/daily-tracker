import type { Habit } from '../domain/habit';
import type { HabitRepository } from '../domain/habit-repository';
import { OperationError } from '@/shared/domain/operation-error';

// Search consumers need the whole catalog, rather than only the visible page.
export async function listHabitChoices(
  repository: HabitRepository,
): Promise<Habit[]> {
  const all: Habit[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += 30) {
    const page = await repository.list(offset);
    for (const habit of page.habits) {
      if (seen.has(habit.id)) throw new OperationError('service');
      seen.add(habit.id);
      all.push(habit);
    }
    if (!page.hasMore) return all;
    if (!page.habits.length) throw new OperationError('service');
  }
}
