import type {
  CreateHabit,
  Habit,
  HabitDayRecord,
  HabitOperationReceipt,
  RecordHabitDay,
} from './habit';

export interface HabitRepository {
  list(offset: number): Promise<{ habits: Habit[]; hasMore: boolean }>;
  findById(id: string): Promise<Habit | null>;
  readDays(
    habitIds: string[],
    from: string,
    to: string,
  ): Promise<HabitDayRecord[]>;
  create(input: CreateHabit): Promise<string>;
  record(input: RecordHabitDay): Promise<HabitOperationReceipt>;
}
