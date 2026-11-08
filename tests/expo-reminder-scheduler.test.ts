import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  createExpoReminderScheduler,
  reminderDestination,
} from '@/features/reminders/infrastructure/expo-reminder-scheduler';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));
const prefix = 'daily-tracker-reminder-v1:';
const targetId = '11111111-1111-4111-8111-111111111111';
const entry = {
  kind: 'habit' as const,
  targetId,
  hour: 23,
  minute: 59,
  weekdays: [1, 7],
};
const text = {
  title: 'Synthetic reminder',
  habit: 'Review your habit',
  routine: 'Review your routine',
  channel: 'Reminders',
};
const scheduler = createExpoReminderScheduler(() => text);
beforeEach(() => {
  jest.resetAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Notifications.NotificationPermissionsStatus);
  jest
    .mocked(Notifications.getPresentedNotificationsAsync)
    .mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());
it('maps ISO Monday/Sunday to native weekdays and verifies weekly requests without exact alarms or names', async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce(
      [1, 7].map((day) => ({
        identifier: `${prefix}alice:habit:${targetId}:${day}`,
      })) as Notifications.NotificationRequest[],
    );
  await scheduler.replace('alice', [entry]);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      trigger: {
        type: 'weekly',
        weekday: 2,
        hour: 23,
        minute: 59,
        delivery: 'bestEffort',
        channelId: 'reminders-v1',
      },
      content: {
        title: text.title,
        body: text.habit,
        sound: 'default',
        data: {
          source: 'daily-tracker-reminder-v1',
          userId: 'alice',
          kind: 'habit',
          targetId,
        },
      },
    }),
  );
  expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      trigger: expect.objectContaining({ weekday: 1 }),
    }),
  );
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});
it('cancels only its own requests and dismisses delivered reminders on logout', async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([
      { identifier: `${prefix}old` },
      { identifier: 'unrelated' },
    ] as Notifications.NotificationRequest[]);
  jest
    .mocked(Notifications.getPresentedNotificationsAsync)
    .mockResolvedValue([
      { request: { identifier: `${prefix}old` } },
      { request: { identifier: 'unrelated' } },
    ] as Notifications.Notification[]);
  await scheduler.replace(null, []);
  expect(
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.calls,
  ).toEqual([[`${prefix}old`]]);
  expect(
    jest.mocked(Notifications.dismissNotificationAsync).mock.calls,
  ).toEqual([[`${prefix}old`]]);
});
it('cleans partial schedules after a native failure so retries do not duplicate alerts', async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { identifier: `${prefix}partial` },
    ] as Notifications.NotificationRequest[]);
  jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mockResolvedValueOnce('one')
    .mockRejectedValueOnce(new Error('native scheduling'));
  await expect(scheduler.replace('alice', [entry])).rejects.toThrow(
    'native scheduling',
  );
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
    `${prefix}partial`,
  );
});
it('handles revoked permission without prompting on restore', async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([]);
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: false,
    canAskAgain: false,
  } as Notifications.NotificationPermissionsStatus);
  await expect(scheduler.replace('alice', [entry])).rejects.toMatchObject({
    code: 'permission',
  });
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(await scheduler.requestPermission()).toBe(false);
});
it('accepts provisional iOS permission', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    granted: false,
    ios: { status: 3 },
  } as Notifications.NotificationPermissionsStatus);
  expect(await scheduler.requestPermission()).toBe(true);
});
it('validates notification destinations against the current account and permits no arbitrary URL', () => {
  const data = {
    source: 'daily-tracker-reminder-v1',
    userId: 'alice',
    kind: 'routine',
    targetId,
  };
  expect(reminderDestination(data, 'alice')).toEqual(data);
  expect(reminderDestination(data, 'bob')).toBeNull();
  expect(reminderDestination(data, null)).toBeNull();
  expect(
    reminderDestination({ ...data, targetId: '../sign-in' }, 'alice'),
  ).toBeNull();
  expect(
    reminderDestination({ url: 'https://example.com' }, 'alice'),
  ).toBeNull();
});
