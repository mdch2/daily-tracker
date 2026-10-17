import type { ReactElement, PropsWithChildren } from 'react';
import { render as renderNative } from '@testing-library/react-native';
import {
  createPreferencesStore,
  type Preferences,
  type PreferenceStorage,
} from '@/shared/preferences/store';
import { PreferencesProvider } from '@/shared/preferences/preferences-provider';
import { LocalizationProvider } from '@/shared/i18n/localization-provider';

export async function render(
  ui: ReactElement,
  values: Preferences = { language: 'es', theme: 'system' },
  storage?: PreferenceStorage,
) {
  const store = createPreferencesStore(
    storage ?? {
      getItem: async () => JSON.stringify(values),
      setItem: async () => undefined,
    },
  );
  await store.getState().hydrate();
  const wrapper = ({ children }: PropsWithChildren) => (
    <PreferencesProvider store={store}>
      <LocalizationProvider>{children}</LocalizationProvider>
    </PreferencesProvider>
  );
  const view = await renderNative(ui, { wrapper });
  return { ...view, preferenceStore: store };
}
