import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocales } from 'expo-localization';
import { I18nextProvider } from 'react-i18next';
import { createAppI18n, resolveLanguage } from './i18n';
import { usePreferences } from '@/shared/preferences/preferences-provider';
import { LoadingScreen, Screen } from '@/shared/ui/primitives';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';

export function LocalizationProvider({ children }: PropsWithChildren) {
  const { values, status } = usePreferences();
  const locales = useLocales();
  const language = resolveLanguage(
    values.language,
    locales.map((locale) => locale.languageTag),
  );
  const [i18n] = useState(() => createAppI18n(language));
  useEffect(() => {
    // Keep children mounted so changing language preserves form and navigation state.
    void i18n.changeLanguage(language);
  }, [i18n, language]);
  return (
    <I18nextProvider i18n={i18n}>
      {status === 'loading' ? (
        <LoadingScreen />
      ) : status === 'error' ? (
        <Screen>
          <PreferencesControls />
        </Screen>
      ) : (
        children
      )}
    </I18nextProvider>
  );
}
