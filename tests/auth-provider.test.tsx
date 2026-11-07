import { act, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import {
  AuthProvider,
  useAuth,
} from '@/features/auth/presentation/auth-provider';
import type {
  AuthChange,
  AuthRepository,
  AuthSession,
} from '@/features/auth/domain/auth-repository';

function Probe() {
  const { state } = useAuth();
  return <Text>{state.status + ':' + (state.session?.userId ?? 'none')}</Text>;
}

function setup(getSession: AuthRepository['getSession']) {
  let listener: ((change: AuthChange) => void) | undefined;
  const unsubscribe = jest.fn();
  const repository: AuthRepository = {
    getSession,
    subscribe: (callback) => {
      listener = callback;
      return unsubscribe;
    },
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    completeRedirect: jest.fn(),
    updatePassword: jest.fn(),
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    repository,
    queryClient,
    unsubscribe,
    emit: (change: AuthChange) => listener?.(change),
  };
}

describe('session projection', () => {
  it('keeps a newer auth event when initial restoration resolves later', async () => {
    let resolveInitial: ((session: AuthSession | null) => void) | undefined;
    const initial = new Promise<AuthSession | null>((resolve) => {
      resolveInitial = resolve;
    });
    const fixture = setup(() => initial);
    await render(
      <QueryClientProvider client={fixture.queryClient}>
        <AuthProvider repository={fixture.repository}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await act(async () =>
      fixture.emit({ session: { userId: 'current-user' }, recovery: false }),
    );
    await act(async () => resolveInitial?.({ userId: 'stale-user' }));
    expect(screen.getByText('ready:current-user')).toBeOnTheScreen();
  });

  it('clears personal query data on identity change and unsubscribes on unmount', async () => {
    const fixture = setup(async () => ({ userId: 'first-user' }));
    const view = await render(
      <QueryClientProvider client={fixture.queryClient}>
        <AuthProvider repository={fixture.repository}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    fixture.queryClient.setQueryData(['profile', 'first-user'], {
      displayName: 'Synthetic name',
    });
    await act(async () =>
      fixture.emit({ session: { userId: 'second-user' }, recovery: false }),
    );
    expect(
      fixture.queryClient.getQueryData(['profile', 'first-user']),
    ).toBeUndefined();
    expect(screen.getByText('ready:second-user')).toBeOnTheScreen();
    await view.unmount();
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('exposes restoration failure as an error instead of a logged-out success', async () => {
    const fixture = setup(async () => {
      throw new Error('Keychain unavailable');
    });
    await render(
      <QueryClientProvider client={fixture.queryClient}>
        <AuthProvider repository={fixture.repository}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('error:none')).toBeOnTheScreen();
  });
});
