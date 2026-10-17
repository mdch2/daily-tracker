import { render } from './helpers/render-localized';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { createAuthActions } from '@/features/auth/application/auth-validation';
import type { AuthRepository } from '@/features/auth/domain/auth-repository';

const mockRepository: AuthRepository = {
  getSession: jest.fn(),
  subscribe: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  requestPasswordReset: jest.fn(),
  completeRedirect: jest.fn(),
  updatePassword: jest.fn(),
};
const mockActions = createAuthActions(mockRepository);
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ actions: mockActions, finishRecovery: jest.fn() }),
}));

describe('sign-in form', () => {
  it('preserves form values and validation when language changes', async () => {
    await render(<AuthScreen mode="sign-in" />);
    await fireEvent.changeText(
      screen.getByLabelText('Correo electrónico'),
      'invalid-email',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Contraseña'),
      'synthetic-password',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(
      await screen.findByText('Introduce un correo válido.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Inglés' }));
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue('invalid-email')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
  });
  it.each([
    ['es', 'Iniciar sesión', 'Introduce un correo válido.'],
    ['en', 'Sign in', 'Enter a valid email address.'],
  ] as const)(
    'shows validation in %s without sending invalid credentials',
    async (language, title, message) => {
      await render(<AuthScreen mode="sign-in" />, {
        language,
        theme: 'system',
      });
      await fireEvent.press(screen.getByRole('button', { name: title }));
      expect(await screen.findByText(message)).toBeOnTheScreen();
      expect(mockRepository.signIn).not.toHaveBeenCalled();
    },
  );
  it('preserves entered values and offers retry after failure', async () => {
    jest
      .mocked(mockRepository.signIn)
      .mockRejectedValue(new Error('Backend unavailable'));
    await render(<AuthScreen mode="sign-in" />, {
      language: 'es',
      theme: 'system',
    });
    await fireEvent.changeText(
      screen.getByLabelText('Correo electrónico'),
      'user@example.test',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Contraseña'),
      'synthetic-password',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('user@example.test')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Iniciar sesión' }),
      ).toBeEnabled(),
    );
  });
});
