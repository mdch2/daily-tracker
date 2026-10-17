import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';

import type { Environment } from '@/shared/config/environment';
import { createChunkedStorage } from './chunked-storage';
import type { Database } from './database.types';

export function createSupabaseClient(environment: Environment) {
  const storage = createChunkedStorage(
    {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) =>
        SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    randomUUID,
  );
  return createClient<Database>(environment.url, environment.publishableKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}

export type BackendClient = ReturnType<typeof createSupabaseClient>;

export function observeAuthLifecycle(client: BackendClient) {
  const refresh = (state: string) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  };
  refresh(AppState.currentState ?? 'inactive');
  const subscription = AppState.addEventListener('change', refresh);
  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}
