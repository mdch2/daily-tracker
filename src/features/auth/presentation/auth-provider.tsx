import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthRepository, AuthSession } from '../domain/auth-repository';
import { createAuthActions } from '../application/auth-validation';

type AuthState = {
  status: 'loading' | 'ready' | 'error';
  session: AuthSession | null;
  recovery: boolean;
};
const AuthContext = createContext<{
  state: AuthState;
  repository: AuthRepository;
  actions: ReturnType<typeof createAuthActions>;
  retry: () => void;
  finishRecovery: () => void;
  beginRecovery: () => void;
} | null>(null);

export function AuthProvider({
  repository,
  children,
}: PropsWithChildren<{ repository: AuthRepository }>) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
    recovery: false,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let eventReceived = false;
    let userId: string | null = null;
    const unsubscribe = repository.subscribe((change) => {
      if (!active) return;
      eventReceived = true;
      if (userId !== (change.session?.userId ?? null)) {
        queryClient.clear();
        userId = change.session?.userId ?? null;
      }
      setState((previous) => ({
        status: 'ready',
        session: change.session,
        recovery: !!change.session && (change.recovery || previous.recovery),
      }));
    });
    void repository
      .getSession()
      .then((session) => {
        if (active && !eventReceived) {
          userId = session?.userId ?? null;
          setState({ status: 'ready', session, recovery: false });
        }
      })
      .catch(() => {
        if (active && !eventReceived)
          setState({ status: 'error', session: null, recovery: false });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repository, queryClient, attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading', session: null, recovery: false });
    setAttempt((value) => value + 1);
  }, []);
  const finishRecovery = useCallback(
    () => setState((value) => ({ ...value, recovery: false })),
    [],
  );
  const beginRecovery = useCallback(
    () => setState((value) => ({ ...value, recovery: true })),
    [],
  );
  const actions = useMemo(() => createAuthActions(repository), [repository]);
  return (
    <AuthContext.Provider
      value={{
        state,
        repository,
        actions,
        retry,
        finishRecovery,
        beginRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is missing.');
  return auth;
}
