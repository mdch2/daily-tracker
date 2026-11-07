import { TextInput } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import { ProfileRepositoryContext } from '@/features/profile/presentation/profile-context';
import type { ProfileRepository } from '@/features/profile/domain/profile-repository';
import type { BusinessContext } from '@/features/profile/domain/business-calendar';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import { userId as mockUserId } from './helpers/habit-fixtures';

jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: mockUserId } } }),
}));
const ready: BusinessContext = {
  configured: true,
  serverTime: '2026-10-21T12:00:00Z',
  today: '2026-10-21',
  timeZone: 'America/Bogota',
  weekStartDay: 1,
  weekStartDate: '2026-10-19',
  nextDayAt: '2026-10-22T05:00:00Z',
};
async function open(context: BusinessContext) {
  const repository: jest.Mocked<ProfileRepository> = {
    findByUserId: jest.fn<
      ReturnType<ProfileRepository['findByUserId']>,
      Parameters<ProfileRepository['findByUserId']>
    >(async () => null),
    getBusinessContext: jest.fn(async () => context),
    initializeHabitCalendar: jest.fn<
      ReturnType<ProfileRepository['initializeHabitCalendar']>,
      Parameters<ProfileRepository['initializeHabitCalendar']>
    >(async () => undefined),
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  await render(
    <QueryClientProvider client={client}>
      <ProfileRepositoryContext.Provider value={repository}>
        <BusinessCalendarGate>
          {() => (
            <TextInput accessibilityLabel="Draft" defaultValue="preserved" />
          )}
        </BusinessCalendarGate>
      </ProfileRepositoryContext.Provider>
    </QueryClientProvider>,
    { language: 'en', theme: 'dark' },
  );
  return { repository, client };
}
describe('explicit account calendar', () => {
  it('has no implicit zone or week start and preserves the input after failure', async () => {
    const { repository } = await open({
      configured: false,
      serverTime: '2026-10-21T12:00:00Z',
    });
    await screen.findByText('Choose your account calendar');
    expect(screen.getByLabelText('IANA time zone')).toHaveProp('value', '');
    expect(screen.getByRole('button', { name: 'Monday' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('IANA time zone'),
      'America/Bogota',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm calendar' }),
    );
    await screen.findByRole('alert');
    expect(repository.initializeHabitCalendar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Monday' }));
    repository.initializeHabitCalendar.mockRejectedValueOnce(
      new OperationError('network'),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm calendar' }),
    );
    await waitFor(() =>
      expect(repository.initializeHabitCalendar).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByDisplayValue('America/Bogota')).toBeOnTheScreen();
    repository.getBusinessContext.mockResolvedValue(ready);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm calendar' }),
    );
    await screen.findByLabelText('Draft');
    expect(repository.initializeHabitCalendar.mock.calls[0]?.[0]).toEqual({
      timeZone: 'America/Bogota',
      weekStartDay: 1,
    });
  });
  it('keeps an existing draft mounted when background context refresh fails', async () => {
    const { repository, client } = await open(ready);
    await screen.findByLabelText('Draft');
    await fireEvent.changeText(
      screen.getByLabelText('Draft'),
      'my unsaved input',
    );
    repository.getBusinessContext.mockRejectedValue(
      new OperationError('network'),
    );
    await act(async () => {
      await client.invalidateQueries({
        queryKey: ['business-context', mockUserId],
      });
    });
    await screen.findByRole('alert');
    expect(screen.getByDisplayValue('my unsaved input')).toBeOnTheScreen();
  });
});
