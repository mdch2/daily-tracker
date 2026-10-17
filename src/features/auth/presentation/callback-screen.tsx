import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RouteLink as Link } from '@/shared/ui/route-link';
import { ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { useAuth } from './auth-provider';

export function CallbackScreen() {
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
          <ErrorMessage message="El enlace no es válido, caducó o se abrió en otro dispositivo. Solicita uno nuevo." />
          <Link href="/reset-password">Solicitar otro enlace</Link>
          <Link href="/sign-in">Iniciar sesión</Link>
        </>
      ) : (
        <Text>Validando enlace…</Text>
      )}
    </Screen>
  );
}
