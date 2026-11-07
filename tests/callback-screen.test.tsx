import { render } from './helpers/render-localized';
import { screen, waitFor } from '@testing-library/react-native';
import { CallbackScreen } from '@/features/auth/presentation/callback-screen';

let mockParams: { code?: string; mode?: string } = {};
const mockCompleteRedirect = jest.fn(async (_code: string) => {});
const mockBeginRecovery = jest.fn();
const mockRouter = { replace: jest.fn() };
const mockRepository = { completeRedirect: mockCompleteRedirect };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({
    repository: mockRepository,
    beginRecovery: mockBeginRecovery,
  }),
}));

describe('email callback', () => {
  it('does not enter recovery when a code fails, and processes a later link', async () => {
    mockParams = { code: 'expired-synthetic-code', mode: 'recovery' };
    mockCompleteRedirect.mockRejectedValueOnce(new Error('Expired'));
    const view = await render(<CallbackScreen />);
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(mockBeginRecovery).not.toHaveBeenCalled();
    mockParams = { code: 'new-synthetic-code', mode: 'recovery' };
    await view.rerender(<CallbackScreen />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith('/update-password'),
    );
    expect(mockBeginRecovery).toHaveBeenCalledTimes(1);
  });
  it('does not send a request without a code', async () => {
    mockParams = {};
    await render(<CallbackScreen />);
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(mockCompleteRedirect).not.toHaveBeenCalled();
  });
});
