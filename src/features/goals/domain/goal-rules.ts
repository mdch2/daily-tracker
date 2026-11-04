import { addBusinessDays } from '@/features/habits/domain/habit-rules';
import type { GoalDefinition, GoalState } from './goal';

export function goalState(
  definition: GoalDefinition,
  today: string,
  achieved: boolean,
): GoalState {
  if (definition.archivedAt) return 'archived';
  if (definition.startDate > today) return 'scheduled';
  if (achieved) return 'achieved';
  return definition.deadline && definition.deadline < today
    ? 'overdue'
    : 'in_progress';
}
export function canRecordGoal(
  definition: GoalDefinition,
  date: string,
  today: string,
): boolean {
  return (
    definition.progressSource === 'manual' &&
    !definition.archivedAt &&
    date >= definition.startDate &&
    date <= today &&
    (definition.mode === 'milestones' || date >= addBusinessDays(today, -7))
  );
}
export function goalPercentage(numerator: number, denominator: number): number {
  if (
    !Number.isSafeInteger(numerator) ||
    numerator < 0 ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0
  )
    throw new Error('Invalid progress');
  return Math.min(100, Math.floor((numerator * 100) / denominator));
}
