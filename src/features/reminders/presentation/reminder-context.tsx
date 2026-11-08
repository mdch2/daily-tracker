import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReminderService } from '../application/reminder-service';

export const ReminderContext = createContext<ReminderService | null>(null);
export function useReminderService() {
  return useContext(ReminderContext);
}
export function useReminderSnapshot(service: ReminderService) {
  return useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
}
