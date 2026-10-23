import type {
  BusinessContext,
  InitialHabitCalendar,
} from './business-calendar';

export type Profile = {
  id: string;
  displayName: string | null;
  timeZone: string | null;
};
export interface ProfileRepository {
  findByUserId(userId: string): Promise<Profile | null>;
  getBusinessContext(): Promise<BusinessContext>;
  initializeHabitCalendar(input: InitialHabitCalendar): Promise<void>;
}
