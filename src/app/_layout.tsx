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
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!state.session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!state.session && state.recovery}>
          <Stack.Screen name="update-password" />
        </Stack.Protected>
        <Stack.Protected guard={!!state.session && !state.recovery}>
          <Stack.Screen name="(tabs)" />
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
