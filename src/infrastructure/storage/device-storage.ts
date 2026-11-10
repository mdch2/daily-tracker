import * as SecureStore from 'expo-secure-store';
import type { SecureKeyValueStore } from '../supabase/chunked-storage';

// Native storage never falls back to unencrypted persistence.
export const deviceStorage: SecureKeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
