import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { useTheme } from '@/shared/theme/use-theme';
import { usePreferences } from './preferences-provider';

export function PreferencesControls() {
  const { t } = useTranslation();
  const { values, status, saving, error, update, hydrate } = usePreferences();
  const { tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text accessibilityRole="header">{t('preferences.title')}</Text>
      <Text>{t('preferences.language')}</Text>
      {(['system', 'es', 'en'] as const).map((language) => (
        <Button
          key={language}
          title={t(`preferences.${language}` as const)}
          selected={values.language === language}
          disabled={status !== 'ready' || saving}
          onPress={() => {
            void update({ language }).catch(() => undefined);
          }}
        />
      ))}
      <Text>{t('preferences.theme')}</Text>
      {(['system', 'light', 'dark'] as const).map((theme) => (
        <Button
          key={theme}
          title={t(`preferences.${theme}` as const)}
          selected={values.theme === theme}
          disabled={status !== 'ready' || saving}
          onPress={() => {
            void update({ theme }).catch(() => undefined);
          }}
        />
      ))}
      {error && (
        <ErrorMessage
          message={t(
            error === 'load'
              ? 'preferences.loadError'
              : 'preferences.saveError',
          )}
        />
      )}
      {status === 'error' && (
        <Button
          title={t('preferences.retryLoad')}
          onPress={() => {
            void hydrate();
          }}
        />
      )}
    </View>
  );
}
