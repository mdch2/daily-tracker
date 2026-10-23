import {
  isAuthRetryableFetchError,
  type AuthError as SupabaseAuthError,
} from '@supabase/supabase-js';
import { AuthError } from '../domain/auth-error';

// Translate only known codes, never server messages or credential-bearing errors.
export function mapAuthError(error: SupabaseAuthError): AuthError {
  if (isAuthRetryableFetchError(error) && error.status === 0) {
    return new AuthError('network');
  }
  if (error.code === 'weak_password') return new AuthError('passwordPolicy');
  if (error.status === 429) return new AuthError('rateLimit');
  return new AuthError('operation');
}
