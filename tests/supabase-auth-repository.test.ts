import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import type { BackendClient } from '@/infrastructure/supabase/client';
import { AuthError } from '@/features/auth/domain/auth-error';
import { createAuthRepository } from '@/features/auth/infrastructure/supabase-auth-repository';

describe('Supabase registration failures', () => {
  it.each([
    [new AuthRetryableFetchError('Sensitive transport details', 0), 'network'],
    [
      new AuthApiError('Sensitive password details', 422, 'weak_password'),
      'passwordPolicy',
    ],
    [
      new AuthApiError(
        'Sensitive rate details',
        429,
        'over_email_send_rate_limit',
      ),
      'rateLimit',
    ],
    [
      new AuthApiError('Private database details', 500, 'unexpected_failure'),
      'operation',
    ],
    [
      new AuthApiError('Account existence details', 422, 'user_already_exists'),
      'operation',
    ],
  ])('maps %s to a safe error code', async (error, code) => {
    const signUp = jest.fn(async () => ({ data: { session: null }, error }));
    const repository = createAuthRepository({
      auth: { signUp },
    } as unknown as BackendClient);
    const failure = await repository
      .signUp({ email: 'user@example.test', password: 'Test123!' })
      .catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(AuthError);
    expect(failure).toMatchObject({ code, message: code });
    expect(JSON.stringify(failure)).not.toContain('details');
  });

  it('requires confirmation only when signup succeeds without a session', async () => {
    const signUp = jest
      .fn()
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({
        data: { session: { user: { id: 'synthetic-id' } } },
        error: null,
      });
    const repository = createAuthRepository({
      auth: { signUp },
    } as unknown as BackendClient);
    const credentials = { email: 'user@example.test', password: 'Test123!' };
    await expect(repository.signUp(credentials)).resolves.toEqual({
      confirmationRequired: true,
    });
    await expect(repository.signUp(credentials)).resolves.toEqual({
      confirmationRequired: false,
    });
    expect(signUp).toHaveBeenCalledWith({
      ...credentials,
      options: { emailRedirectTo: 'dailytracker://callback' },
    });
  });
});
