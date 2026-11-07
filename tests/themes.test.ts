import { resolveTheme } from '@/shared/theme/use-theme';
import { palettes } from '@/shared/theme/tokens';
import { createNavigationTheme } from '@/shared/theme/navigation-theme';
import { DefaultTheme } from 'expo-router';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
describe('mandatory themes', () => {
  it.each([
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
    ['system', 'light', 'light'],
    ['system', 'dark', 'dark'],
    ['system', null, 'light'],
  ] as const)(
    'resolves preference %s with device %s',
    (preference, device, expected) => {
      expect(resolveTheme(preference, device)).toBe(expected);
    },
  );
  it.each(['light', 'dark'] as const)(
    'maps navigation and accessible text colors to %s tokens',
    (mode) => {
      const colors = palettes[mode];
      const navigation = createNavigationTheme(mode, DefaultTheme);
      expect(navigation.colors.background).toBe(colors.background);
      expect(navigation.colors.card).toBe(colors.surface);
      expect(navigation.dark).toBe(mode === 'dark');
      for (const [foreground, background] of [
        [colors.text, colors.background],
        [colors.text, colors.surface],
        [colors.text, colors.selection],
        [colors.muted, colors.surface],
        [colors.text, colors.accentSoft],
        [colors.muted, colors.accentSoft],
        [colors.text, colors.elevated],
        [colors.muted, colors.elevated],
        [colors.error, colors.background],
        [colors.link, colors.background],
        [colors.link, colors.surface],
        [colors.link, colors.field],
        [colors.link, colors.accentSoft],
        [colors.link, colors.elevated],
        [colors.muted, colors.background],
        [colors.muted, colors.field],
        [colors.error, colors.errorSurface],
        [colors.success, colors.successSurface],
        [colors.onAction, colors.action],
        [colors.onAction, colors.actionPressed],
      ])
        expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.fieldBorder, colors.field)).toBeGreaterThanOrEqual(
        3,
      );
    },
  );
});
