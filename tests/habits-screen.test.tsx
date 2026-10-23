import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HabitsScreen } from '@/features/habits/presentation/habits-screen';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { OperationError } from '@/shared/domain/operation-error';
import type { Habit } from '@/features/habits/domain/habit';
import { render } from './helpers/render-localized';
import {
  repositoryStub,
  habit,
  day,
  userId as mockUserId,
} from './helpers/habit-fixtures';

const mockPush = jest.fn();
let mockToday = '2026-10-21';
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: mockUserId } } }),
}));
jest.mock('@/features/profile/presentation/business-calendar-gate', () => ({
  BusinessCalendarGate: ({
    children,
  }: {
    children: (context: unknown) => ReactNode;
  }) =>
    children({
      configured: true,
      today: mockToday,
      weekStartDate: '2026-10-19',
      weekStartDay: 1,
      timeZone: 'America/Bogota',
    }),
}));
const binary: Habit = {
  ...habit,
  id: '31000000-0000-4000-8000-000000000005',
  name: 'Synthetic walk',
  definition: {
    id: '31000000-0000-4000-8000-000000000006',
    effectiveFrom: habit.startDate,
    timeZone: 'America/Bogota',
    weekStartDay: 1,
    measurementMode: 'binary',
    scheduleType: 'daily',
  },
};
async function open(
  configure?: (repository: ReturnType<typeof repositoryStub>) => void,
) {
  const repository = repositoryStub();
  repository.list.mockResolvedValue({
    habits: [habit, binary],
    hasMore: false,
  });
  repository.readDays.mockImplementation(async (ids, from, to) =>
    [day('2026-10-21', 20000, 2)].filter(
      (row) => ids.includes(row.habitId) && row.date >= from && row.date <= to,
    ),
  );
  configure?.(repository);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={repository}>
        <HabitsScreen />
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>,
    { language: 'en', theme: 'dark' },
  );
  await waitFor(() =>
    expect(screen.queryByText('Loading habits…')).not.toBeOnTheScreen(),
  );
  return { repository, client, ...view };
}
describe('daily and historical habit views', () => {
  beforeEach(() => {
    mockToday = '2026-10-21';
    mockPush.mockClear();
  });
  it('switches the actual layouts, reads bounded history and keeps the selected filter', async () => {
    const { repository } = await open();
    expect(
      screen.getByRole('tab', { name: 'Daily view', selected: true }),
    ).toBeOnTheScreen();
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(repository.readDays).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('tab', { name: 'History view' }));
    await waitFor(() => expect(screen.getAllByRole('image')).toHaveLength(2));
    expect(repository.readDays).toHaveBeenCalledWith(
      [habit.id, binary.id],
      '2026-07-06',
      '2026-08-02',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Quantity' }));
    expect(screen.queryByText(binary.name)).not.toBeOnTheScreen();
    expect(screen.getAllByRole('image')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('tab', { name: 'Daily view' }));
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Quantity', selected: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Preferences')).not.toBeOnTheScreen();
  });
  it('does not render a failed historical batch as missed days and can recover', async () => {
    const { repository } = await open();
    repository.readDays.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(screen.getByRole('tab', { name: 'History view' }));
    await screen.findByRole('alert');
    expect(screen.queryAllByRole('image')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getAllByRole('image')).toHaveLength(2));
  });
  it('retains the draft and blocks sheet dismissal until an uncertain save is retried', async () => {
    const { repository } = await open();
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Record today for Synthetic reading',
      }),
    );
    await fireEvent.changeText(await screen.findByLabelText('Amount'), '2,5');
    repository.record.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add contribution' }),
    );
    const retry = await screen.findByRole('button', {
      name: 'Retry the same save',
    });
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByDisplayValue('2,5')).toBeOnTheScreen();
    await fireEvent.press(retry);
    await screen.findByText('Saved and confirmed.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled(),
    );
    expect(repository.record.mock.calls[0]?.[0]).toEqual(
      repository.record.mock.calls[1]?.[0],
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByLabelText('Amount')).not.toBeOnTheScreen();
  });
  it('allows inspecting an older window but keeps its records read-only', async () => {
    await open((repository) =>
      repository.list.mockResolvedValue({
        habits: [{ ...habit, startDate: '2026-01-01' }],
        hasMore: false,
      }),
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'History view' }));
    await screen.findByRole('image');
    await fireEvent.press(screen.getByRole('button', { name: 'Older dates' }));
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Inspect the history of Synthetic reading',
      }),
    );
    await screen.findByText(
      'Read only. New records and corrections require an eligible date from today or the previous seven days.',
    );
    expect(screen.getByRole('button', { name: 'Set total' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next date' })).toBeDisabled();
  });
  it('shows a confirmed empty state without requesting day records', async () => {
    const { repository } = await open((value) =>
      value.list.mockResolvedValue({ habits: [], hasMore: false }),
    );
    expect(
      screen.getByText('No habits yet. Create your first one.'),
    ).toBeOnTheScreen();
    expect(repository.readDays).not.toHaveBeenCalled();
  });
  it('keeps the entry and its operation when the account date crosses midnight', async () => {
    const { repository, client, rerender } = await open();
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Record today for Synthetic reading',
      }),
    );
    await fireEvent.changeText(await screen.findByLabelText('Amount'), '2,5');
    repository.record.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add contribution' }),
    );
    await screen.findByRole('button', { name: 'Retry the same save' });
    mockToday = '2026-10-22';
    await rerender(
      <QueryClientProvider client={client}>
        <HabitRepositoryContext.Provider value={repository}>
          <HabitsScreen />
        </HabitRepositoryContext.Provider>
      </QueryClientProvider>,
    );
    expect(screen.getByDisplayValue('2,5')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry the same save' }),
    );
    await screen.findByText('Saved and confirmed.');
    expect(repository.record.mock.calls[0]?.[0]).toEqual(
      repository.record.mock.calls[1]?.[0],
    );
    expect(repository.record.mock.calls[1]?.[0].date).toBe('2026-10-21');
  });
});
