import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Environment } from '@/shared/config/environment';
import { createSessionStorage } from './session-storage';
import type { Database } from './database.types';
import { installAuthCrypto } from './auth-crypto';

export function createSupabaseClient(environment: Environment) {
  installAuthCrypto();
  const storage = createSessionStorage();
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
  // Supabase manages browser visibility itself; AppState refresh is native only.
  if (Platform.OS === 'web') return;
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
