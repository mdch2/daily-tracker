import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { palettes, tokens } from './tokens';

type ThemePreference = 'system' | 'light' | 'dark';
export const useThemePreference = create<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}>((set) => ({
  preference: 'system',
  setPreference: (preference) => set({ preference }),
}));

export function useTheme() {
  const system = useColorScheme();
  const preference = useThemePreference((state) => state.preference);
  const mode = preference === 'system' ? (system ?? 'light') : preference;
  return { colors: palettes[mode], tokens, mode };
}
