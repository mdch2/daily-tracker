export type AuthSession = { userId: string };
export type Credentials = { email: string; password: string };
export type AuthChange = { session: AuthSession | null; recovery: boolean };

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  subscribe(listener: (change: AuthChange) => void): () => void;
  signIn(credentials: Credentials): Promise<void>;
  signUp(credentials: Credentials): Promise<{ confirmationRequired: boolean }>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  completeRedirect(code: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}
