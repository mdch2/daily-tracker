import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RouteLink as Link } from '@/shared/ui/route-link';
import { ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { useAuth } from './auth-provider';
import { useTranslation } from 'react-i18next';

export function CallbackScreen() {
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
  return (
    <Screen>
      {failedCode === code || !code || Array.isArray(code) ? (
        <>
          <ErrorMessage message={t('auth.invalidLink')} />
          <Link href="/reset-password">{t('auth.requestAnother')}</Link>
          <Link href="/sign-in">{t('auth.signIn')}</Link>
        </>
      ) : (
        <Text>{t('auth.validatingLink')}</Text>
      )}
    </Screen>
  );
}
