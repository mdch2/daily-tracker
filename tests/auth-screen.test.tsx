import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import mockSafeArea from 'react-native-safe-area-context/jest/mock';
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
jest.mock('react-native-safe-area-context', () => mockSafeArea);

describe('sign-in form', () => {
  it('shows validation without sending invalid credentials', async () => {
    await render(<AuthScreen mode="sign-in" />);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Iniciar sesión' }),
    );
    expect(
      await screen.findByText('Introduce un correo válido.'),
    ).toBeOnTheScreen();
    expect(mockRepository.signIn).not.toHaveBeenCalled();
  });
  it('preserves entered values and offers retry after failure', async () => {
    jest
      .mocked(mockRepository.signIn)
      .mockRejectedValue(new Error('Backend unavailable'));
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
