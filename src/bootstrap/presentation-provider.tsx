import type { PropsWithChildren } from 'react';
import { DefaultTheme, DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/shared/theme/use-theme';
import { createNavigationTheme } from '@/shared/theme/navigation-theme';
import { LocalizationProvider } from '@/shared/i18n/localization-provider';

export function PresentationProvider({ children }: PropsWithChildren) {
  const { mode } = useTheme();
  const navigationTheme = createNavigationTheme(
    mode,
    mode === 'dark' ? DarkTheme : DefaultTheme,
  );
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <LocalizationProvider>{children}</LocalizationProvider>
    </ThemeProvider>
  );
}
