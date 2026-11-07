import { createContext, useContext } from 'react';
import type { HabitRepository } from '../domain/habit-repository';

export const HabitRepositoryContext = createContext<HabitRepository | null>(
  null,
);
export function useHabitRepository() {
  const repository = useContext(HabitRepositoryContext);
  if (!repository) throw new Error('Habit repository is missing.');
  return repository;
}
