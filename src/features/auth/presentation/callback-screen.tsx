import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RouteLink as Link } from '@/shared/ui/route-link';
import { ActivityIndicator, View } from 'react-native';
import { ErrorMessage, Text } from '@/shared/ui/primitives';
import { useTheme } from '@/shared/theme/use-theme';
import { AuthFrame } from './auth-frame';
import { useAuth } from './auth-provider';
import { useTranslation } from 'react-i18next';

export function CallbackScreen() {
  const { colors, tokens } = useTheme();
  const { t } = useTranslation();
  const { code, mode } = useLocalSearchParams<{
    code?: string;
    mode?: string;
  }>();
  const { repository, beginRecovery } = useAuth();
  const router = useRouter();
  const startedCode = useRef<string | null>(null);
  const [failedCode, setFailedCode] = useState<string | null>(null);
  useEffect(() => {
    if (!code || Array.isArray(code) || startedCode.current === code) return;
    startedCode.current = code;
    void repository
      .completeRedirect(code)
      .then(() => {
        if (mode === 'recovery') beginRecovery();
        router.replace(mode === 'recovery' ? '/update-password' : '/');
      })
      .catch(() => setFailedCode(code));
  }, [code, mode, repository, router, beginRecovery]);
  const invalid = failedCode === code || !code || Array.isArray(code);
  return (
    <AuthFrame
      title={t(invalid ? 'auth.invalidLinkTitle' : 'auth.callbackTitle')}
      description={t(
        invalid ? 'auth.invalidLinkDescription' : 'auth.callbackDescription',
      )}
      eyebrow={t('auth.checkEmailEyebrow')}
      illustration={invalid ? 'link-2' : 'mail'}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: tokens.radius.card,
          padding: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
      >
        {invalid ? (
          <>
            <ErrorMessage message={t('auth.invalidLink')} />
            <Link href="/reset-password">{t('auth.requestAnother')}</Link>
            <Link href="/sign-in">{t('auth.signIn')}</Link>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.link} />
            <Text accessibilityLiveRegion="polite">
              {t('auth.validatingLink')}
            </Text>
          </>
        )}
      </View>
    </AuthFrame>
  );
}
