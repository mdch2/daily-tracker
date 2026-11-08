export type ReminderTarget = { kind: 'habit' | 'routine'; targetId: string };
export type Reminder = ReminderTarget & {
  hour: number;
  minute: number;
  // ISO weekdays: Monday = 1, Sunday = 7. Independent of business recurrence.
  weekdays: number[];
};
export const MAX_REMINDERS = 8;
export function sameTarget(a: ReminderTarget, b: ReminderTarget) {
  return a.kind === b.kind && a.targetId === b.targetId;
}
export type ReminderErrorCode =
  'invalid' | 'limit' | 'permission' | 'storage' | 'schedule' | 'unavailable';
export class ReminderError extends Error {
  constructor(public readonly code: ReminderErrorCode) {
    super(code);
  }
}
export interface ReminderStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}
export interface ReminderScheduler {
  requestPermission(): Promise<boolean>;
  replace(userId: string | null, entries: readonly Reminder[]): Promise<void>;
}
