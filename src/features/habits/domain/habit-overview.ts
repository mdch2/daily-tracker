import type { Habit, HabitDayRecord } from './habit';
import { habitAtDate, isEligible, isCompleted } from './habit-rules';

export function dailyHabitOverview(
  habits: Habit[],
  records: HabitDayRecord[],
  date: string,
) {
  const eligible = habits
    .map((habit) => habitAtDate(habit, date))
    .filter((habit) => isEligible(habit, date));
  // Flexible weekly habits are opportunities, never daily obligations.
  const scheduled = eligible.filter(
    (habit) => habit.definition.scheduleType !== 'weekly',
  );
  const completed = scheduled.filter((habit) =>
    isCompleted(
      habit,
      records.find(
        (record) => record.habitId === habit.id && record.date === date,
      ),
    ),
  ).length;
  return { eligible, scheduled: scheduled.length, completed };
}
