import type { SecureKeyValueStore } from '../supabase/chunked-storage';

// Resolve lazily: importing a web module must not access browser-only globals.
// Access/quota failures propagate to the caller's existing error/retry state.
export function createBrowserStorage(
  kind: 'localStorage' | 'sessionStorage',
): SecureKeyValueStore {
  return {
    async getItem(key) {
      return window[kind].getItem(key);
    },
    async setItem(key, value) {
      window[kind].setItem(key, value);
    },
    async removeItem(key) {
      window[kind].removeItem(key);
    },
  };
}
