import type { i18n } from 'i18next';
import { deviceStorage } from '@/infrastructure/storage/device-storage';
import {
  createReminderService,
  type ReminderService,
} from '@/features/reminders/application/reminder-service';
import { createExpoReminderScheduler } from '@/features/reminders/infrastructure/expo-reminder-scheduler';

export function createRuntimeReminders(i18n: i18n): ReminderService | null {
  return createReminderService(
    {
      read: () => deviceStorage.getItem('daily-tracker.reminders.v1'),
      write: (value) =>
        deviceStorage.setItem('daily-tracker.reminders.v1', value),
    },
    createExpoReminderScheduler(() => ({
      title: i18n.t('reminders.notificationTitle'),
      habit: i18n.t('reminders.notificationHabit'),
      routine: i18n.t('reminders.notificationRoutine'),
      channel: i18n.t('reminders.title'),
    })),
  );
}
