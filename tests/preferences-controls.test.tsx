import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { Text as NativeText } from 'react-native';
import { useLocales } from 'expo-localization';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { useTheme } from '@/shared/theme/use-theme';
import { Input } from '@/shared/ui/primitives';
import { render } from './helpers/render-localized';

const deviceScheme = jest
  .spyOn(ReactNative, 'useColorScheme')
  .mockReturnValue('light');
afterEach(() => {
  deviceScheme.mockReturnValue('light');
});
function Probe() {
  const { mode } = useTheme();
  return (
    <>
      <NativeText testID="mode">{mode}</NativeText>
      <Input label="Synthetic field" />
      <PreferencesControls />
    </>
  );
}
describe('preference controls', () => {
  it('switches visible language and saves the preference', async () => {
    const view = await render(<PreferencesControls />);
    await fireEvent.press(screen.getByRole('button', { name: 'Inglés' }));
    expect(await screen.findByText('Preferences')).toBeOnTheScreen();
    expect(view.preferenceStore.getState().values.language).toBe('en');
  });
  it.each(['light', 'dark', 'system'] as const)(
    'applies the %s mode to controls and keyboard',
    async (theme) => {
      const view = await render(<Probe />, { language: 'en', theme: 'system' });
      await act(async () => {
        await view.preferenceStore.getState().update({ theme });
      });
      const mode = theme === 'dark' ? 'dark' : 'light';
      expect(screen.getByTestId('mode')).toHaveTextContent(mode);
      expect(
        screen.getByLabelText('Synthetic field').props.keyboardAppearance,
      ).toBe(mode);
      expect(
        screen.getByRole('button', {
          name:
            theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light',
          selected: true,
        }),
      ).toBeOnTheScreen();
    },
  );
  it('reacts to device language changes while in system mode', async () => {
    const view = await render(<PreferencesControls />, {
      language: 'system',
      theme: 'system',
    });
    expect(screen.getByText('Preferencias')).toBeOnTheScreen();
    const previousLocales = useLocales();
    jest
      .mocked(useLocales)
      .mockReturnValue([
        { ...previousLocales[0], languageTag: 'en-GB', languageCode: 'en' },
      ]);
    await view.rerender(<PreferencesControls />);
    await waitFor(() =>
      expect(screen.getByText('Preferences')).toBeOnTheScreen(),
    );
  });

  it('updates system mode when device appearance changes', async () => {
    const view = await render(<Probe />, { language: 'en', theme: 'system' });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    deviceScheme.mockReturnValue('dark');
    await view.rerender(<Probe />);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    await act(async () => {
      await view.preferenceStore.getState().update({ theme: 'light' });
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
  });
  it('shows a translated save error and retains the previous preference', async () => {
    const view = await render(
      <PreferencesControls />,
      { language: 'en', theme: 'system' },
      {
        getItem: async () =>
          JSON.stringify({ language: 'en', theme: 'system' }),
        setItem: async () => {
          throw new Error('Locked');
        },
      },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Preferences could not be saved\./,
    );
    expect(view.preferenceStore.getState().values.theme).toBe('system');
  });
});
