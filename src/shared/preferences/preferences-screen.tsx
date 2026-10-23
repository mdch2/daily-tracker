import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon } from '@/shared/ui/icon';
import { Screen, Text } from '@/shared/ui/primitives';

export function PreferencesScreen() {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
        }}
      >
        <Icon name="sliders" color={colors.link} size={26} />
        <Text accessibilityRole="header" weight="bold" style={{ fontSize: 28 }}>
          {t('navigation.more')}
        </Text>
      </View>
      <Text style={{ color: colors.muted }}>{t('preferences.subtitle')}</Text>
      <View
        style={{
          padding: tokens.spacing.md,
          borderRadius: tokens.radius.card,
          backgroundColor: colors.surface,
        }}
      >
        <PreferencesControls />
      </View>
    </Screen>
  );
}
