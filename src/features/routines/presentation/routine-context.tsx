import { createContext, useContext } from 'react';
import type { RoutineRepository } from '../domain/routine';

export const RoutineRepositoryContext = createContext<RoutineRepository | null>(
  null,
);
export function useRoutineRepository() {
  const repository = useContext(RoutineRepositoryContext);
  if (!repository) throw new Error('Routine repository is missing.');
  return repository;
}
