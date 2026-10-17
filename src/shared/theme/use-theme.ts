import { useColorScheme } from 'react-native';
import { usePreferences } from '@/shared/preferences/preferences-provider';
import type { ThemePreference } from '@/shared/preferences/store';
import { palettes, tokens } from './tokens';

export function resolveTheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | null | undefined,
) {
  return preference === 'system' ? (system ?? 'light') : preference;
}

export function useTheme() {
  const system = useColorScheme();
  const preference = usePreferences().values.theme;
  const mode = resolveTheme(preference, system);
  return { colors: palettes[mode], tokens, mode };
}
