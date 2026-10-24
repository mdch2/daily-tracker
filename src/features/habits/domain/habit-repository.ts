import type {
  CreateHabit,
  Habit,
  HabitDayRecord,
  HabitOperationReceipt,
  RecordHabitDay,
  RenameHabit,
  EditHabit,
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
  rename(input: RenameHabit): Promise<void>;
  edit(input: EditHabit): Promise<{ effectiveFrom: string }>;
  record(input: RecordHabitDay): Promise<HabitOperationReceipt>;
}
