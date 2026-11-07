import { createContext, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import type { GoalRepository } from '../domain/goal';

export const GoalRepositoryContext = createContext<GoalRepository | null>(null);
export function useGoalRepository() {
  const repository = useContext(GoalRepositoryContext);
  if (!repository) throw new Error('Goal repository is missing.');
  return repository;
}
export function useGoalPageReset(reset: () => void, today: string) {
  const client = useQueryClient();
  const { state } = useAuth();
  const user = state.session?.userId;
  useEffect(() => {
    reset();
  }, [reset, today]);
  useEffect(
    () =>
      client.getQueryCache().subscribe((event) => {
        if (
          event.type === 'updated' &&
          event.action.type === 'invalidate' &&
          event.query.queryKey[0] === 'goals' &&
          event.query.queryKey[1] === user
        )
          reset();
      }),
    [client, user, reset],
  );
}
