export const MAX_MILLIUNITS = 999_999_999_999;

export type Measurement =
  | { measurementMode: 'binary' }
  | {
      measurementMode: 'quantity';
      targetMilliunits: number;
      unitLabel: string;
    };
export type Schedule =
  | { scheduleType: 'daily' }
  | { scheduleType: 'weekdays'; weekdayMask: number }
  | { scheduleType: 'weekly'; weeklyTarget: number };
export type CreateHabit = { id: string; name: string } & Measurement & Schedule;
export type Habit = {
  id: string;
  name: string;
  startDate: string;
  createdAt: string;
  definition: Measurement &
    Schedule & {
      id: string;
      effectiveFrom: string;
      timeZone: string;
      weekStartDay: 1 | 7;
    };
};
export type HabitDayRecord = {
  habitId: string;
  definitionId: string;
  date: string;
  revision: number;
  binaryValue: boolean | null;
  amountMilliunits: number | null;
  recordedAt: string;
  updatedAt: string;
};
export type RecordHabitDay = {
  operationId: string;
  habitId: string;
  date: string;
} & (
  | { kind: 'set_binary'; binaryValue: boolean; expectedRevision: number }
  | { kind: 'add_amount'; amountMilliunits: number }
  | { kind: 'set_total'; amountMilliunits: number; expectedRevision: number }
);
export type HabitOperationReceipt = {
  operationId: string;
  habitId: string;
  date: string;
  revision: number;
  binaryValue: boolean | null;
  amountMilliunits: number | null;
};
