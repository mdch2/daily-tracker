import type { Habit } from '@/features/habits/domain/habit';
import {
  habitAtDate,
  isEligible,
  isCompleted,
} from '@/features/habits/domain/habit-rules';
import { OperationError } from '@/shared/domain/operation-error';
import type { Routine, RoutineWindow } from './routine';

export function routineDefinitionFor(routine: Routine, date: string) {
  const first = routine.definitions[0];
  if (!first) throw new OperationError('service');
  return routine.definitions.reduce(
    (latest, value) =>
      value.effectiveFrom <= date && value.effectiveFrom > latest.effectiveFrom
        ? value
        : latest,
    first,
  );
}
export function routineArchiveDate(routine: Routine) {
  if (!routine.archivedAt) return null;
  const zone = routine.definitions[0]?.timeZone;
  if (!zone) throw new OperationError('service');
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(routine.archivedAt));
  return ['year', 'month', 'day']
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join('-');
}
export function routineScheduled(routine: Routine, date: string) {
  if (date < routine.startDate) return false;
  const archived = routineArchiveDate(routine);
  if (archived && date > archived) return false;
  const definition = routineDefinitionFor(routine, date);
  const day = new Date(date + 'T00:00:00Z').getUTCDay() || 7;
  return (
    definition.scheduleType === 'daily' ||
    (definition.weekdayMask & (1 << (day - 1))) !== 0
  );
}
export function evaluateRoutine(
  routine: Routine,
  date: string,
  today: string,
  window: RoutineWindow,
) {
  const scheduled = routineScheduled(routine, date);
  const steps = routineDefinitionFor(routine, date).steps.map((step) => {
    if (step.kind === 'own') {
      const record = window.records.find(
        (value) => value.stepId === step.id && value.date === date,
      );
      return {
        step,
        eligible: scheduled,
        required: step.required,
        completed: record?.completed === true,
        ownRecord: record,
        habit: undefined as Habit | undefined,
        incompatible: false,
      };
    }
    const source = window.habits.find((habit) => habit.id === step.habitId);
    if (!source) throw new OperationError('service');
    const habit = habitAtDate(source, date);
    const flexible = habit.definition.scheduleType === 'weekly';
    const record = window.habitRecords.find(
      (value) => value.habitId === habit.id && value.date === date,
    );
    return {
      step,
      habit,
      eligible: scheduled && isEligible(habit, date),
      required: step.required && !flexible,
      completed: isCompleted(habit, record),
      ownRecord: undefined,
      incompatible: step.required && flexible,
    };
  });
  const required = steps.filter((step) => step.eligible && step.required);
  const completed = required.filter((step) => step.completed).length;
  const total = required.length;
  const status =
    date < routine.startDate
      ? 'notStarted'
      : !scheduled
        ? 'notScheduled'
        : date > today
          ? 'future'
          : total === 0
            ? 'notEvaluable'
            : completed === total
              ? 'completed'
              : date < today
                ? 'missed'
                : completed > 0
                  ? 'partial'
                  : 'pending';
  return {
    steps,
    completed,
    total,
    status,
    percent: total ? Math.floor((completed * 100) / total) : null,
  } as const;
}
