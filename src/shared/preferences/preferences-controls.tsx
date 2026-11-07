import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { useTheme } from '@/shared/theme/use-theme';
import { usePreferences } from './preferences-provider';

export function PreferencesControls() {
  const { t } = useTranslation();
  const { values, status, saving, error, update, hydrate } = usePreferences();
  const { colors, tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.lg }}>
      <Text accessibilityRole="header" weight="bold" style={{ fontSize: 20 }}>
        {t('preferences.title')}
      </Text>
      <View style={{ gap: tokens.spacing.sm }}>
        <Text weight="semibold">{t('preferences.language')}</Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.spacing.sm,
          }}
        >
          {(['system', 'es', 'en'] as const).map((language) => (
            <View key={language} style={{ flexGrow: 1, flexBasis: 88 }}>
              <Button
                title={t(`preferences.${language}` as const)}
                selected={values.language === language}
                disabled={status !== 'ready' || saving}
                onPress={() => {
                  void update({ language }).catch(() => undefined);
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: tokens.spacing.sm }}>
        <Text weight="semibold">{t('preferences.theme')}</Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.spacing.sm,
          }}
        >
          {(['system', 'light', 'dark'] as const).map((theme) => (
            <View key={theme} style={{ flexGrow: 1, flexBasis: 88 }}>
              <Button
                title={t(`preferences.${theme}` as const)}
                selected={values.theme === theme}
                disabled={status !== 'ready' || saving}
                onPress={() => {
                  void update({ theme }).catch(() => undefined);
                }}
              />
            </View>
          ))}
        </View>
      </View>
      {saving && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <ActivityIndicator color={colors.link} />
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.muted, fontSize: 14 }}
          >
            {t('preferences.saving')}
          </Text>
        </View>
      )}
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
