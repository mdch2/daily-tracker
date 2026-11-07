import type { Habit, HabitDayRecord } from '@/features/habits/domain/habit';
import type { HabitRepository } from '@/features/habits/domain/habit-repository';
import { OperationError } from '@/shared/domain/operation-error';
import type {
  Routine,
  RoutineDayRecord,
  RoutineRepository,
  RoutineWindow,
} from '../domain/routine';

export async function readRoutineWindow(
  repository: RoutineRepository,
  habitRepository: HabitRepository,
  routines: Routine[],
  from: string,
  to: string,
): Promise<RoutineWindow> {
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > 28 ||
    (days > 1 && routines.length !== 1)
  )
    throw new OperationError('invalidInput');
  const records: RoutineDayRecord[] = [];
  for (let offset = 0; offset < routines.length; offset += 10)
    records.push(
      ...(await repository.readDays(
        routines.slice(offset, offset + 10).map((routine) => routine.id),
        from,
        to,
      )),
    );
  const ids = [
    ...new Set(
      routines.flatMap((routine) =>
        routine.definitions.flatMap((definition) =>
          definition.steps.flatMap((step) =>
            step.kind === 'habit' ? [step.habitId] : [],
          ),
        ),
      ),
    ),
  ];
  const habits: Habit[] = [];
  // Fetch just the referenced identities. Bounded parallel groups avoid a request per rendered step.
  for (let offset = 0; offset < ids.length; offset += 10) {
    const group = await Promise.all(
      ids.slice(offset, offset + 10).map((id) => habitRepository.findById(id)),
    );
    if (group.some((habit) => !habit)) throw new OperationError('service');
    habits.push(...group.filter((habit): habit is Habit => habit !== null));
  }
  const habitRecords: HabitDayRecord[] = [];
  for (let offset = 0; offset < ids.length; offset += 30)
    habitRecords.push(
      ...(await habitRepository.readDays(
        ids.slice(offset, offset + 30),
        from,
        to,
      )),
    );
  return { records, habits, habitRecords };
}
