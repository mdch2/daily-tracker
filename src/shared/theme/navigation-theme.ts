import type { Theme } from 'expo-router';
import { palettes } from './tokens';

export function createNavigationTheme(
  mode: 'light' | 'dark',
  base: Theme,
): Theme {
  const colors = palettes[mode];
  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: colors.link,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };
}
