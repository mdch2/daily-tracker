import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppProviders } from '@/bootstrap/providers';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import {
  Button,
  ErrorMessage,
  LoadingScreen,
  Screen,
} from '@/shared/ui/primitives';

function RootNavigator() {
  const { state, retry } = useAuth();
  const { t } = useTranslation();
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'error')
    return (
      <Screen>
        <ErrorMessage message={t('errors.session')} />
        <Button title={t('common.retry')} onPress={retry} />
      </Screen>
    );
  const fallbackRoute = !state.session
    ? '/sign-in'
    : state.recovery
      ? '/update-password'
      : '/';
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!state.session} redirectTo={fallbackRoute}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected
          guard={!!state.session && state.recovery}
          redirectTo={fallbackRoute}
        >
          <Stack.Screen name="update-password" />
        </Stack.Protected>
        <Stack.Protected
          guard={!!state.session && !state.recovery}
          redirectTo={fallbackRoute}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habits" />
        </Stack.Protected>
        <Stack.Screen name="callback" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
