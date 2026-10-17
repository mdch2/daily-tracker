import { useEffect, useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { readEnvironment } from '@/shared/config/environment';
import {
  createSupabaseClient,
  observeAuthLifecycle,
} from '@/infrastructure/supabase/client';
import { createAuthRepository } from '@/features/auth/infrastructure/supabase-auth-repository';
import { createProfileRepository } from '@/features/profile/infrastructure/supabase-profile-repository';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { ProfileRepositoryContext } from '@/features/profile/presentation/profile-context';
import { Screen, Text } from '@/shared/ui/primitives';

function createRuntime() {
  const environment = readEnvironment();
  if (!environment) return null;
  const client = createSupabaseClient(environment);
  return {
    client,
    auth: createAuthRepository(client),
    profiles: createProfileRepository(client),
  };
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
  const [runtime] = useState(createRuntime);
  useEffect(
    () => (runtime ? observeAuthLifecycle(runtime.client) : undefined),
    [runtime],
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {runtime ? (
          <AuthProvider repository={runtime.auth}>
            <ProfileRepositoryContext.Provider value={runtime.profiles}>
              {children}
            </ProfileRepositoryContext.Provider>
          </AuthProvider>
        ) : (
          <Screen>
            <Text accessibilityRole="header">Configuración pendiente</Text>
            <Text>
              Completa EXPO_PUBLIC_SUPABASE_URL y
              EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env con la URL y la clave
              publicable del proyecto. Reinicia Expo después del cambio.
            </Text>
            <Text>
              Consulta README.md para preparar Supabase. La aplicación no
              utilizará credenciales de ejemplo.
            </Text>
          </Screen>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
