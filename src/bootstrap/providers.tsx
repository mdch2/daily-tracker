import { useEffect, useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
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
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { ProfileRepositoryContext } from '@/features/profile/presentation/profile-context';
import { Screen, Text } from '@/shared/ui/primitives';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { createPreferencesStore } from '@/shared/preferences/store';
import { PreferencesProvider } from '@/shared/preferences/preferences-provider';
import { PresentationProvider } from './presentation-provider';
import { FontProvider } from './font-provider';

function createRuntime() {
  const environment = readEnvironment();
  if (!environment) return null;
  const client = createSupabaseClient(environment);
  return {
    client,
    auth: createAuthRepository(client),
    profiles: createProfileRepository(client),
    habits: createHabitRepository(client),
    routines: createRoutineRepository(client),
  };
}
function BackendProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [runtime] = useState(createRuntime);
  useEffect(
    () => (runtime ? observeAuthLifecycle(runtime.client) : undefined),
    [runtime],
  );
  return runtime ? (
    <AuthProvider repository={runtime.auth}>
      <ProfileRepositoryContext.Provider value={runtime.profiles}>
        <HabitRepositoryContext.Provider value={runtime.habits}>
          <RoutineRepositoryContext.Provider value={runtime.routines}>
            {children}
          </RoutineRepositoryContext.Provider>
        </HabitRepositoryContext.Provider>
      </ProfileRepositoryContext.Provider>
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
