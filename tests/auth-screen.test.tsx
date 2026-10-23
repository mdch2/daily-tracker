import { render } from './helpers/render-localized';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { createAuthActions } from '@/features/auth/application/auth-validation';
import type { AuthRepository } from '@/features/auth/domain/auth-repository';
import { AuthError } from '@/features/auth/domain/auth-error';

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
const mockFinishRecovery = jest.fn();
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ actions: mockActions, finishRecovery: mockFinishRecovery }),
}));

describe('sign-in form', () => {
  beforeEach(() => {
    jest.mocked(mockRepository.signUp).mockReset();
  });
  it.each([
    [
      'es',
      'light',
      'network',
      'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.',
    ],
    [
      'en',
      'dark',
      'network',
      'Could not connect. Check your internet connection and try again.',
    ],
    [
      'es',
      'dark',
      'passwordPolicy',
      'Esta contraseña no cumple los requisitos de seguridad del servicio. Elige una contraseña más larga y única e inténtalo de nuevo.',
    ],
    [
      'en',
      'system',
      'rateLimit',
      'Too many requests. Wait a few minutes and try again.',
    ],
  ] as const)(
    'preserves sign-up input and permits retry after %s/%s/%s',
    async (language, theme, code, message) => {
      jest
        .mocked(mockRepository.signUp)
        .mockRejectedValueOnce(new AuthError(code))
        .mockResolvedValueOnce({ confirmationRequired: true });
      await render(<AuthScreen mode="sign-up" />, { language, theme });
      const emailLabel =
        language === 'es' ? 'Correo electrónico' : 'Email address';
      const passwordLabel =
        language === 'es' ? 'Nueva contraseña' : 'New password';
      const title = language === 'es' ? 'Crear cuenta' : 'Create account';
      await fireEvent.changeText(
        screen.getByLabelText(emailLabel),
        'user@example.test',
      );
      await fireEvent.changeText(
        screen.getByLabelText(passwordLabel),
        'Test123!',
      );
      await fireEvent.press(screen.getByRole('button', { name: title }));
      expect(await screen.findByText(message)).toBeOnTheScreen();
      expect(screen.getByDisplayValue('user@example.test')).toBeOnTheScreen();
      expect(screen.getByDisplayValue('Test123!')).toBeOnTheScreen();
      expect(
        screen.queryByText(
          language === 'es' ? 'Revisa tu correo.' : 'Check your email.',
        ),
      ).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: title }));
      expect(
        await screen.findByRole('header', {
          name: language === 'es' ? 'Revisa tu correo.' : 'Check your email.',
        }),
      ).toBeOnTheScreen();
    },
    15000,
  );

  it.each([
    [
      'es',
      'Correo electrónico',
      'Nueva contraseña',
      'Crear cuenta',
      'Usa al menos 8 caracteres.',
    ],
    [
      'en',
      'Email address',
      'New password',
      'Create account',
      'Use at least 8 characters.',
    ],
  ] as const)(
    'requires eight characters for sign-up in %s',
    async (language, emailLabel, passwordLabel, title, message) => {
      jest
        .mocked(mockRepository.signUp)
        .mockResolvedValueOnce({ confirmationRequired: true });
      await render(<AuthScreen mode="sign-up" />, {
        language,
        theme: 'system',
      });
      await fireEvent.changeText(
        screen.getByLabelText(emailLabel),
        'user@example.test',
      );
      await fireEvent.changeText(
        screen.getByLabelText(passwordLabel),
        'a'.repeat(7),
      );
      await fireEvent.press(screen.getByRole('button', { name: title }));
      expect(await screen.findByText(message)).toBeOnTheScreen();
      expect(mockRepository.signUp).not.toHaveBeenCalled();
      await fireEvent.changeText(
        screen.getByLabelText(passwordLabel),
        'a'.repeat(8),
      );
      await fireEvent.press(screen.getByRole('button', { name: title }));
      await waitFor(() =>
        expect(mockRepository.signUp).toHaveBeenCalledWith({
          email: 'user@example.test',
          password: 'a'.repeat(8),
        }),
      );
    },
    15000,
  );

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
    await fireEvent.press(
      screen.getByRole('button', { name: 'Idioma y apariencia' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Inglés' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue('invalid-email')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
  }, 15000);
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

  it('reveals and hides the password without changing its value', async () => {
    await render(<AuthScreen mode="sign-in" />, {
      language: 'en',
      theme: 'dark',
    });
    const password = screen.getByLabelText('Password');
    await fireEvent.changeText(password, 'synthetic-password');
    expect(password.props.secureTextEntry).toBe(true);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Show password' }),
    );
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Hide password' }),
    );
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('prevents repeated requests while showing the busy state', async () => {
    let finish!: () => void;
    jest.mocked(mockRepository.signIn).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await render(<AuthScreen mode="sign-in" />);
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
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Iniciar sesión' }).props
          .accessibilityState,
      ).toEqual({ busy: true, disabled: true }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(mockRepository.signIn).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Iniciar sesión' }),
      ).toBeEnabled(),
    );
  });

  it('shows confirmation only after sign-up succeeds and preserves the email when editing it', async () => {
    jest
      .mocked(mockRepository.signUp)
      .mockResolvedValueOnce({ confirmationRequired: true });
    await render(<AuthScreen mode="sign-up" />);
    await fireEvent.changeText(
      screen.getByLabelText('Correo electrónico'),
      'user@example.test',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Nueva contraseña'),
      'synthetic-password',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByRole('header', { name: 'Revisa tu correo.' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('user@example.test')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Usar otro correo' }),
    );
    expect(screen.getByDisplayValue('user@example.test')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
  });

  it('shows generic recovery confirmation after a confirmed request', async () => {
    jest.mocked(mockRepository.requestPasswordReset).mockResolvedValueOnce();
    await render(<AuthScreen mode="reset-password" />, {
      language: 'en',
      theme: 'light',
    });
    expect(screen.queryByLabelText('Password')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('Email address'),
      'user@example.test',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Request recovery link' }),
    );
    expect(
      await screen.findByText(/If an account exists for that email/),
    ).toBeOnTheScreen();
    expect(mockRepository.requestPasswordReset).toHaveBeenCalledWith(
      'user@example.test',
    );
  });

  it('keeps recovery open on failure and finishes it after the password is saved', async () => {
    jest
      .mocked(mockRepository.updatePassword)
      .mockRejectedValueOnce(new Error('Synthetic failure'))
      .mockResolvedValueOnce();
    await render(<AuthScreen mode="update-password" />, {
      language: 'en',
      theme: 'dark',
    });
    expect(screen.queryByLabelText('Email address')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('New password'),
      'synthetic-password',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Save password' }),
    );
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(mockFinishRecovery).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('synthetic-password')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Save password' }),
    );
    await waitFor(() => expect(mockFinishRecovery).toHaveBeenCalledTimes(1));
  });

  it.each(['light', 'dark', 'system'] as const)(
    'supports appearance changes in %s without clearing credentials',
    async (theme) => {
      await render(<AuthScreen mode="sign-in" />, { language: 'en', theme });
      await fireEvent.changeText(
        screen.getByLabelText('Email address'),
        'user@example.test',
      );
      await fireEvent.press(
        screen.getByRole('button', { name: 'Language and appearance' }),
      );
      await fireEvent.press(
        screen.getByRole('button', {
          name: theme === 'dark' ? 'Light' : 'Dark',
        }),
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
      expect(screen.getByDisplayValue('user@example.test')).toBeOnTheScreen();
      expect(
        screen.queryByText(/invitado|guest|Biometría|Apple|Google/i),
      ).not.toBeOnTheScreen();
    },
  );
});
