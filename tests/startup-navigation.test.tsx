import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import type { AuthSession } from '@/features/auth/domain/auth-repository';

let mockSession: AuthSession | null = null;
let mockRecovery = false;

jest.mock('@/bootstrap/providers', () => ({
  AppProviders: ({ children }: PropsWithChildren) => children,
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({
    state: { status: 'ready', session: mockSession, recovery: mockRecovery },
    retry: jest.fn(),
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// Navigation isolation replaces AppProviders; supply the tab theme independently.
jest.mock('@/shared/theme/use-theme', () => ({
  useTheme: () => {
    const { palettes, tokens } = jest.requireActual('@/shared/theme/tokens');
    return { colors: palettes.light, tokens, mode: 'light' };
  },
}));

async function openApp(initialUrl: string) {
  return renderRouter(
    {
      appDir: './src/app',
      overrides: {
        '(auth)/sign-in': () => <Text>Sign in screen</Text>,
        '(auth)/sign-up': () => <Text>Sign up screen</Text>,
        '(auth)/reset-password': () => <Text>Reset password screen</Text>,
        '(tabs)/index': () => <Text>Dashboard screen</Text>,
        '(tabs)/habits': () => <Text>Habits screen</Text>,
        '(tabs)/more': () => <Text>Preferences screen</Text>,
        'habits/new': () => <Text>Create habit screen</Text>,
        'habits/[id]': () => <Text>Habit detail screen</Text>,
        'update-password': () => <Text>Update password screen</Text>,
        callback: () => <Text>Callback screen</Text>,
      },
    },
    { initialUrl },
  );
}

describe('startup navigation', () => {
  beforeEach(() => {
    mockSession = null;
    mockRecovery = false;
  });

  it.each(['/', 'dailytracker:///'])(
    'opens sign-in when launched at %s without a session',
    async (initialUrl) => {
      const view = await openApp(initialUrl);
      expect(screen.getByText('Sign in screen')).toBeOnTheScreen();
      expect(view.getPathname()).toBe('/sign-in');
    },
    15000,
  );

  it('opens the dashboard when a session is restored', async () => {
    mockSession = { userId: 'synthetic-user' };
    const view = await openApp('/');
    expect(screen.getByText('Dashboard screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/');
  });

  it.each(['/habits', '/habits/new', '/habits/synthetic-id', '/more'])(
    'protects the habit route %s without a session',
    async (url) => {
      const view = await openApp(url);
      expect(screen.getByText('Sign in screen')).toBeOnTheScreen();
      expect(view.getPathname()).toBe('/sign-in');
    },
    15000,
  );

  it('opens habit detail for an authenticated deep link', async () => {
    mockSession = { userId: 'synthetic-user' };
    const view = await openApp('/habits/synthetic-id');
    expect(screen.getByText('Habit detail screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/habits/synthetic-id');
  }, 15000);

  it('opens password recovery instead of the dashboard during recovery', async () => {
    mockSession = { userId: 'synthetic-user' };
    mockRecovery = true;
    const view = await openApp('/');
    expect(screen.getByText('Update password screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/update-password');
  });

  it('redirects an authenticated sign-in link to the dashboard', async () => {
    mockSession = { userId: 'synthetic-user' };
    const view = await openApp('/sign-in');
    expect(screen.getByText('Dashboard screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/');
  });

  it('keeps email callbacks reachable without a session', async () => {
    const view = await openApp('/callback?code=synthetic-code');
    expect(screen.getByText('Callback screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/callback');
  });

  it('redirects a password update link to sign-in without a session', async () => {
    const view = await openApp('/update-password');
    expect(screen.getByText('Sign in screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/sign-in');
  });

  it('redirects sign-in links to password recovery during recovery', async () => {
    mockSession = { userId: 'synthetic-user' };
    mockRecovery = true;
    const view = await openApp('/sign-in');
    expect(screen.getByText('Update password screen')).toBeOnTheScreen();
    expect(view.getPathname()).toBe('/update-password');
  });
});
