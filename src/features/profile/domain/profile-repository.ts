export type Profile = {
  id: string;
  displayName: string | null;
  timeZone: string | null;
};
export interface ProfileRepository {
  findByUserId(userId: string): Promise<Profile | null>;
}
