import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import type { ReminderService } from '@/features/reminders/application/reminder-service';
import { reminderDestination } from '@/features/reminders/infrastructure/expo-reminder-scheduler';

export function ReminderLifecycle({ service }: { service: ReminderService }) {
  const { state } = useAuth();
  const { i18n } = useTranslation();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const userId = state.session?.userId ?? null;
  useEffect(() => {
    if (state.status === 'loading') return;
    void service.activate(userId).catch(() => undefined);
    const sub = AppState.addEventListener('change', (value) => {
      if (value === 'active' && !service.getSnapshot().busy)
        void service.activate(userId).catch(() => undefined);
    });
    return () => sub.remove();
  }, [service, userId, state.status, i18n.resolvedLanguage]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (state.status !== 'ready' || state.recovery || !navigation?.key) return;
    const open = (response: Notifications.NotificationResponse) => {
      const target = reminderDestination(
        response.notification.request.content.data,
        userId,
      );
      Notifications.clearLastNotificationResponse();
      if (target)
        router.push({
          pathname: target.kind === 'habit' ? '/habits/[id]' : '/routines/[id]',
          params: { id: target.targetId },
        });
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(open);
    const response = Notifications.getLastNotificationResponse();
    if (response) open(response);
    return () => listener.remove();
  }, [router, userId, state.status, state.recovery, navigation?.key]);
  return null;
}
