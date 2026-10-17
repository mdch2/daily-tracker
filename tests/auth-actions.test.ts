import { createAuthActions } from '@/features/auth/application/auth-validation';
import type { AuthRepository } from '@/features/auth/domain/auth-repository';

function makeRepository(): AuthRepository {
  return {
    getSession: jest.fn(),
    subscribe: jest.fn(),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    completeRedirect: jest.fn(),
    updatePassword: jest.fn(),
  };
}

describe('auth input boundary', () => {
  it('rejects invalid data before contacting the backend', () => {
    const repository = makeRepository();
    const actions = createAuthActions(repository);
    expect(() => actions.signIn({ email: 'invalid', password: '' })).toThrow();
    expect(() =>
      actions.signUp({ email: 'user@example.test', password: 'short' }),
    ).toThrow();
    expect(repository.signIn).not.toHaveBeenCalled();
    expect(repository.signUp).not.toHaveBeenCalled();
  });
  it('does not apply new password requirements to existing logins', async () => {
    const repository = makeRepository();
    await createAuthActions(repository).signIn({
      email: 'user@example.test',
      password: 'existing',
    });
    expect(repository.signIn).toHaveBeenCalledWith({
      email: 'user@example.test',
      password: 'existing',
    });
  });
  it('propagates write failure without reporting success', async () => {
    const repository = makeRepository();
    jest
      .mocked(repository.requestPasswordReset)
      .mockRejectedValue(new Error('Unavailable'));
    await expect(
      createAuthActions(repository).requestPasswordReset({
        email: 'user@example.test',
      }),
    ).rejects.toThrow('Unavailable');
  });
});
