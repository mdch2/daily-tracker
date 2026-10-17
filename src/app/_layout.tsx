import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/bootstrap/providers';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import {
  Button,
  ErrorMessage,
  LoadingScreen,
  Screen,
} from '@/shared/ui/primitives';
import { useTheme } from '@/shared/theme/use-theme';

function RootNavigator() {
  const { state, retry } = useAuth();
  const { mode } = useTheme();
  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'error')
    return (
      <Screen>
        <ErrorMessage message="No se pudo recuperar la sesión de forma segura." />
        <Button title="Reintentar" onPress={retry} />
      </Screen>
    );
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
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
