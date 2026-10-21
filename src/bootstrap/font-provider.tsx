import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';

function FontLoader({
  children,
  onRetry,
}: PropsWithChildren<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    ...Feather.font,
  });
  if (loaded) return children;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      {error ? (
        <>
          <Text
            accessibilityRole="alert"
            style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}
          >
            {t('errors.fonts')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={{
              minHeight: 48,
              borderRadius: 16,
              padding: 16,
              backgroundColor: colors.action,
            }}
          >
            <Text style={{ color: colors.onAction, fontSize: 16 }}>
              {t('common.retry')}
            </Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator
          color={colors.link}
          accessibilityLabel={t('common.loading')}
        />
      )}
    </View>
  );
}

export function FontProvider({ children }: PropsWithChildren) {
  const [attempt, setAttempt] = useState(0);
  return (
    <FontLoader key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      {children}
    </FontLoader>
  );
}
