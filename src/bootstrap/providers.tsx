import { useEffect, useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import type { i18n } from 'i18next';
import { readEnvironment } from '@/shared/config/environment';
import {
  createSupabaseClient,
  observeAuthLifecycle,
} from '@/infrastructure/supabase/client';
import { createAuthRepository } from '@/features/auth/infrastructure/supabase-auth-repository';
import { createProfileRepository } from '@/features/profile/infrastructure/supabase-profile-repository';
import { createHabitRepository } from '@/features/habits/infrastructure/supabase-habit-repository';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { createRoutineRepository } from '@/features/routines/infrastructure/supabase-routine-repository';
import { RoutineRepositoryContext } from '@/features/routines/presentation/routine-context';
import { createGoalRepository } from '@/features/goals/infrastructure/supabase-goal-repository';
import { GoalRepositoryContext } from '@/features/goals/presentation/goal-context';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { ProfileRepositoryContext } from '@/features/profile/presentation/profile-context';
import { Screen, Text } from '@/shared/ui/primitives';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { createPreferencesStore } from '@/shared/preferences/store';
import { PreferencesProvider } from '@/shared/preferences/preferences-provider';
import { PresentationProvider } from './presentation-provider';
import { FontProvider } from './font-provider';
import { createReminderService } from '@/features/reminders/application/reminder-service';
import { createExpoReminderScheduler } from '@/features/reminders/infrastructure/expo-reminder-scheduler';
import { ReminderContext } from '@/features/reminders/presentation/reminder-context';
import { ReminderLifecycle } from './reminder-lifecycle';

function createRuntime(i18n: i18n) {
  const environment = readEnvironment();
  if (!environment) return null;
  const client = createSupabaseClient(environment);
  const reminders = createReminderService(
    {
      read: () => SecureStore.getItemAsync('daily-tracker.reminders.v1'),
      write: (value) =>
        SecureStore.setItemAsync('daily-tracker.reminders.v1', value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
    },
    createExpoReminderScheduler(() => ({
      title: i18n.t('reminders.notificationTitle'),
      habit: i18n.t('reminders.notificationHabit'),
      routine: i18n.t('reminders.notificationRoutine'),
      channel: i18n.t('reminders.title'),
    })),
  );
  const auth = createAuthRepository(client);
  const routines = createRoutineRepository(client);
  return {
    client,
    reminders,
    auth: {
      ...auth,
      async signOut() {
        await reminders.reset();
        await auth.signOut();
      },
    },
    profiles: createProfileRepository(client),
    habits: createHabitRepository(client),
    routines: {
      ...routines,
      async archive(input: Parameters<typeof routines.archive>[0]) {
        // Stop this device's reminders before the routine becomes read-only.
        await reminders.remove({ kind: 'routine', targetId: input.routineId });
        await routines.archive(input);
      },
    },
    goals: createGoalRepository(client),
  };
}
function BackendProvider({ children }: PropsWithChildren) {
  const { t, i18n } = useTranslation();
  const [runtime] = useState(() => createRuntime(i18n));
  useEffect(
    () => (runtime ? observeAuthLifecycle(runtime.client) : undefined),
    [runtime],
  );
  return runtime ? (
    <AuthProvider repository={runtime.auth}>
      <ReminderContext.Provider value={runtime.reminders}>
        <ReminderLifecycle service={runtime.reminders} />
        <ProfileRepositoryContext.Provider value={runtime.profiles}>
          <HabitRepositoryContext.Provider value={runtime.habits}>
            <RoutineRepositoryContext.Provider value={runtime.routines}>
              <GoalRepositoryContext.Provider value={runtime.goals}>
                {children}
              </GoalRepositoryContext.Provider>
            </RoutineRepositoryContext.Provider>
          </HabitRepositoryContext.Provider>
        </ProfileRepositoryContext.Provider>
      </ReminderContext.Provider>
    </AuthProvider>
  ) : (
    <Screen>
      <Text accessibilityRole="header">{t('config.title')}</Text>
      <Text>{t('config.instructions')}</Text>
      <Text>{t('config.help')}</Text>
      <PreferencesControls />
    </Screen>
  );
}
export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: false },
        },
      }),
  );
  const [preferences] = useState(() =>
    createPreferencesStore({
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) =>
        SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
    }),
  );
  return (
    <SafeAreaProvider>
      <PreferencesProvider store={preferences}>
        <PresentationProvider>
          <FontProvider>
            <QueryClientProvider client={queryClient}>
              <BackendProvider>{children}</BackendProvider>
            </QueryClientProvider>
          </FontProvider>
        </PresentationProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
