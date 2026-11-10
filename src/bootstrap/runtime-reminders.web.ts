import type { i18n } from 'i18next';
import type { ReminderService } from '@/features/reminders/application/reminder-service';

// Local notifications are a native capability. No storage or SDK calls on web.
export function createRuntimeReminders(_i18n: i18n): ReminderService | null {
  return null;
}
