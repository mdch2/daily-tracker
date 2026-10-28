import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { useProfileRepository } from './profile-context';

export function useBusinessContext() {
  const { state } = useAuth();
  const repository = useProfileRepository();
  const client = useQueryClient();
  const userId = state.session?.userId;
  const query = useQuery({
    queryKey: ['business-context', userId],
    queryFn: () => repository.getBusinessContext(),
    enabled: !!userId,
  });
  const { data, refetch, dataUpdatedAt } = query;
  const refresh = useCallback(async () => {
    await refetch();
    await client.invalidateQueries({ queryKey: ['habits', userId] });
    await client.invalidateQueries({ queryKey: ['routines', userId] });
  }, [client, refetch, userId]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (value) => {
      if (value === 'active') void refresh();
    });
    return () => listener.remove();
  }, [refresh]);
  useEffect(() => {
    if (!data?.configured) return;
    // Delay comes from server instants; a wrong device wall clock cannot define business dates.
    const cacheAge = Math.max(0, Date.now() - dataUpdatedAt);
    const delay = Math.max(
      1000,
      Date.parse(data.nextDayAt) - Date.parse(data.serverTime) - cacheAge + 100,
    );
    const timer = setTimeout(() => {
      void refresh();
    }, delay);
    return () => clearTimeout(timer);
  }, [data, dataUpdatedAt, refresh]);
  return query;
}
