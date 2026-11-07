export type AuthErrorCode =
  'network' | 'passwordPolicy' | 'rateLimit' | 'operation';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}
