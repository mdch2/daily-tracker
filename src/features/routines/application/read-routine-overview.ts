import type { HabitRepository } from '@/features/habits/domain/habit-repository';
import { OperationError } from '@/shared/domain/operation-error';
import type { Routine, RoutineRepository } from '../domain/routine';
import { routineScheduled } from '../domain/routine-rules';
import { readRoutineWindow } from './read-routine-window';

export async function readRoutineOverview(
  repository: RoutineRepository,
  habits: HabitRepository,
  date: string,
  today: string,
) {
  const routines: Routine[] = [];
  for (const archived of date < today ? [false, true] : [false]) {
    for (let offset = 0; ; offset += 20) {
      const page = await repository.list(offset, archived);
      routines.push(
        ...page.routines.filter((routine) => routineScheduled(routine, date)),
      );
      if (!page.hasMore) break;
      if (!page.routines.length) throw new OperationError('service');
    }
  }
  const window = await readRoutineWindow(
    repository,
    habits,
    routines,
    date,
    date,
  );
  return { routines, window };
}
