import {
  useRef,
  useState,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PreferencesSheet } from '@/shared/preferences/preferences-sheet';
import { usePreferences } from '@/shared/preferences/preferences-provider';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Screen, Text } from '@/shared/ui/primitives';

function BrandMark({ large = false }: { large?: boolean }) {
  const { colors } = useTheme();
  const size = large ? 20 : 10;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: size * 2 + 5,
        gap: 5,
        transform: [{ rotate: '-6deg' }],
      }}
    >
      {[0, 1, 2, 3].map((cell) => (
        <View
          key={cell}
          style={{
            width: size,
            height: size,
            borderRadius: large ? 6 : 3,
            backgroundColor: cell === 3 ? colors.link : colors.action,
            opacity: cell === 3 ? 0.25 : cell === 1 ? 0.65 : 1,
          }}
        />
      ))}
    </View>
  );
}

export function AuthFrame({
  children,
  title,
  description,
  eyebrow,
  illustration,
}: PropsWithChildren<{
  title: string;
  description: string;
  eyebrow: string;
  illustration?: IconName;
}>) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const { values } = usePreferences();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const preferencesRef = useRef<ComponentRef<typeof View>>(null);
  return (
    <Screen contentStyle={{ gap: 0, paddingTop: tokens.spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing.md,
          paddingBottom: tokens.spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flexShrink: 1,
          }}
        >
          <BrandMark />
          <Text
            weight="bold"
            style={{ fontSize: 17, letterSpacing: -0.5, flexShrink: 1 }}
          >
            {t('common.appName')}
          </Text>
        </View>
        <Pressable
          ref={preferencesRef}
          accessibilityRole="button"
          accessibilityLabel={t('preferences.open')}
          accessibilityState={{ expanded: preferencesOpen }}
          onPress={() => {
            Keyboard.dismiss();
            setPreferencesOpen(true);
          }}
          style={({ pressed }) => ({
            minHeight: 48,
            minWidth: 48,
            borderRadius: tokens.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.selection : colors.elevated,
            borderColor: colors.border,
            borderWidth: 1,
          })}
        >
          <Icon name="sliders" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View
        style={{
          paddingTop: tokens.spacing.sm,
          paddingBottom: tokens.spacing.lg,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {illustration ? (
            <Icon name={illustration} size={30} color={colors.link} />
          ) : (
            <BrandMark large />
          )}
        </View>
        <Text
          weight="bold"
          style={{
            color: colors.link,
            fontSize: 13,
            lineHeight: 20,
            letterSpacing: 1.8,
          }}
        >
          {eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          weight="bold"
          style={{
            fontSize: tokens.typography.title,
            lineHeight: 40,
            letterSpacing: -1.2,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 25, maxWidth: 380 }}>
          {description}
        </Text>
      </View>
      {children}
      <View
        style={{
          marginTop: 'auto',
          paddingTop: tokens.spacing.xl,
          paddingBottom: tokens.spacing.sm,
          gap: tokens.spacing.sm,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <Icon name="shield" size={15} />
          <Text
            weight="medium"
            style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}
          >
            {t('auth.accountAccess')}
          </Text>
        </View>
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 20,
            textAlign: 'center',
          }}
        >
          {t('preferences.summary', {
            language: t(`preferences.${values.language}`),
            theme: t(`preferences.${values.theme}`),
          })}
        </Text>
      </View>
      <PreferencesSheet
        visible={preferencesOpen}
        onClose={() => {
          setPreferencesOpen(false);
          if (Platform.OS === 'web') preferencesRef.current?.focus();
        }}
      />
    </Screen>
  );
}
