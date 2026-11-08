import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  IosAuthorizationStatus,
} from 'expo-notifications';
import { z } from 'zod';
import { ReminderError, type ReminderScheduler } from '../domain/reminder';

const PREFIX = 'daily-tracker-reminder-v1:';
const CHANNEL = 'reminders-v1';
const responseSchema = z.object({
  source: z.literal('daily-tracker-reminder-v1'),
  userId: z.string(),
  kind: z.enum(['habit', 'routine']),
  targetId: z.uuid(),
});
export function reminderDestination(data: unknown, userId: string | null) {
  const parsed = responseSchema.safeParse(data);
  return parsed.success && parsed.data.userId === userId ? parsed.data : null;
}
export function createExpoReminderScheduler(
  text: () => {
    title: string;
    habit: string;
    routine: string;
    channel: string;
  },
): ReminderScheduler {
  async function clear() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduled) {
      if (request.identifier.startsWith(PREFIX))
        await Notifications.cancelScheduledNotificationAsync(
          request.identifier,
        );
    }
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      if (notification.request.identifier.startsWith(PREFIX))
        await Notifications.dismissNotificationAsync(
          notification.request.identifier,
        );
    }
  }
  async function channel() {
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: text().channel,
        importance: AndroidImportance.DEFAULT,
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
      });
  }
  return {
    async requestPermission() {
      if (Platform.OS === 'web') throw new ReminderError('unavailable');
      await channel();
      const granted = (result: Notifications.NotificationPermissionsStatus) =>
        result.granted ||
        result.ios?.status === IosAuthorizationStatus.PROVISIONAL;
      const current = await Notifications.getPermissionsAsync();
      if (granted(current)) return true;
      if (!current.canAskAgain) return false;
      return granted(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        }),
      );
    },
    async replace(userId, entries) {
      if (Platform.OS === 'web') {
        if (entries.length) throw new ReminderError('unavailable');
        return;
      }
      await clear();
      if (!userId || !entries.length) return;
      const permission = await Notifications.getPermissionsAsync();
      if (
        !permission.granted &&
        permission.ios?.status !== IosAuthorizationStatus.PROVISIONAL
      )
        throw new ReminderError('permission');
      await channel();
      try {
        for (const entry of entries) {
          for (const day of entry.weekdays) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${PREFIX}${userId}:${entry.kind}:${entry.targetId}:${day}`,
              content: {
                title: text().title,
                body: text()[entry.kind],
                sound: 'default',
                data: {
                  source: 'daily-tracker-reminder-v1',
                  userId,
                  kind: entry.kind,
                  targetId: entry.targetId,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: day === 7 ? 1 : day + 1,
                hour: entry.hour,
                minute: entry.minute,
                channelId: CHANNEL,
                delivery: 'bestEffort',
              },
            });
          }
        }
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
        const expected = entries.reduce(
          (sum, entry) => sum + entry.weekdays.length,
          0,
        );
        if (
          scheduled.filter((item) => item.identifier.startsWith(PREFIX))
            .length !== expected
        )
          throw new ReminderError('schedule');
      } catch (error) {
        await clear();
        throw error;
      }
    },
  };
}
