import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateHabitScreen } from '@/features/habits/presentation/create-habit-screen';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import { repositoryStub, userId as mockUserId } from './helpers/habit-fixtures';
import type { ReactNode } from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));
jest.mock('@/shared/ui/route-link', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    RouteLink: ({ children }: { children: ReactNode }) => (
      <Text>{children}</Text>
    ),
  };
});
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: mockUserId } } }),
}));
jest.mock('@/features/profile/presentation/business-calendar-gate', () => ({
  BusinessCalendarGate: ({ children }: { children: () => ReactNode }) =>
    children(),
}));

async function open() {
  const repository = repositoryStub();
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 } },
  });
  await render(
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={repository}>
        <CreateHabitScreen />
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>,
    { language: 'en', theme: 'light' },
  );
  return repository;
}
describe('create habit form', () => {
  beforeEach(() => mockReplace.mockClear());
  it('preserves exact creation identity on an uncertain response', async () => {
    const repository = await open();
    repository.create.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'Synthetic reading',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    const retry = await screen.findByRole('button', {
      name: 'Retry the same save',
    });
    expect(screen.getByDisplayValue('Synthetic reading')).toBeOnTheScreen();
    expect(screen.getByLabelText('Habit name')).toHaveProp('editable', false);
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(retry);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      repository.create.mock.calls[1]?.[0],
    );
  });
  it('creates a quantitative flexible-week habit with an exact daily minimum', async () => {
    const repository = await open();
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'Synthetic water',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Quantity' }));
    await fireEvent.changeText(screen.getByLabelText('Unit'), 'litres');
    await fireEvent.changeText(screen.getByLabelText('Minimum per day'), '2,5');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Days per week, without fixed days' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Different days per week'),
      '3',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      name: 'Synthetic water',
      measurementMode: 'quantity',
      targetMilliunits: 2500,
      unitLabel: 'litres',
      scheduleType: 'weekly',
      weeklyTarget: 3,
    });
  });
  it('edits the workweek preset using accessible day names without inline preferences', async () => {
    const repository = await open();
    expect(screen.queryByText('Preferences')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'Synthetic walk',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Selected weekdays' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Monday to Friday' }),
    );
    expect(
      screen.getByRole('button', { name: 'Monday', selected: true }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Thursday' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Saturday' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      measurementMode: 'binary',
      scheduleType: 'weekdays',
      weekdayMask: 55,
    });
  });
});
