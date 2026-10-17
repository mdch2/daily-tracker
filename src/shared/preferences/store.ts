import { createStore } from 'zustand/vanilla';
import { z } from 'zod';

const preferenceSchema = z.object({
  language: z.enum(['system', 'es', 'en']),
  theme: z.enum(['system', 'light', 'dark']),
});
export type Preferences = z.infer<typeof preferenceSchema>;
export type ThemePreference = Preferences['theme'];
export type LanguagePreference = Preferences['language'];
export interface PreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
type PreferenceState = {
  values: Preferences;
  status: 'loading' | 'ready' | 'error';
  saving: boolean;
  error: 'load' | 'save' | null;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Preferences>) => Promise<void>;
};
export const preferenceStorageKey = 'daily-tracker.preferences.v1';

export function createPreferencesStore(storage: PreferenceStorage) {
  let hydration: Promise<void> | undefined;
  let pending: Promise<void> = Promise.resolve();
  return createStore<PreferenceState>((set, get) => ({
    values: { language: 'system', theme: 'system' },
    status: 'loading',
    saving: false,
    error: null,
    hydrate: () => {
      if (hydration) return hydration;
      hydration = (async () => {
        try {
          const raw = await storage.getItem(preferenceStorageKey);
          const values =
            raw === null
              ? ({ language: 'system', theme: 'system' } as const)
              : preferenceSchema.parse(JSON.parse(raw));
          set({ values, status: 'ready', error: null });
        } catch {
          set({ status: 'error', error: 'load' });
        } finally {
          hydration = undefined;
        }
      })();
      return hydration;
    },
    update: (patch) => {
      const operation = pending.then(async () => {
        if (get().status !== 'ready')
          throw new Error('Preferences are not loaded.');
        const values = preferenceSchema.parse({ ...get().values, ...patch });
        set({ saving: true, error: null });
        try {
          await storage.setItem(preferenceStorageKey, JSON.stringify(values));
          set({ values, error: null });
        } catch {
          set({ error: 'save' });
          throw new Error('Preferences could not be saved.');
        } finally {
          set({ saving: false });
        }
      });
      pending = operation.catch(() => undefined);
      return operation;
    },
  }));
}
export type PreferencesStore = ReturnType<typeof createPreferencesStore>;
