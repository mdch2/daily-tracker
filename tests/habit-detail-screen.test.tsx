import type { ReactNode } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HabitDetailScreen } from '@/features/habits/presentation/habit-detail-screen';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import {
  repositoryStub,
  habit,
  day,
  userId as mockUserId,
} from './helpers/habit-fixtures';

let mockToday = '2026-10-21';
let mockDate: string | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({
    id: '31000000-0000-4000-8000-000000000001',
    date: mockDate,
  }),
  Link: ({ children }: { children: ReactNode }) => children,
}));
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

async function open(
  configure?: (repository: ReturnType<typeof repositoryStub>) => void,
) {
  const repository = repositoryStub();
  let rows = [day('2026-10-21', 5000, 2), day('2026-10-20')];
  repository.readDays.mockImplementation(async (_ids, from, to) =>
    rows.filter((row) => row.date >= from && row.date <= to),
  );
  repository.record.mockImplementation(async (input) => {
    const row = day(
      input.date,
      input.kind === 'set_binary' ? null : input.amountMilliunits,
      3,
    );
    rows = [row, ...rows.filter((value) => value.date !== row.date)];
    return { ...row, operationId: input.operationId };
  });
  configure?.(repository);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={repository}>
        <HabitDetailScreen />
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>
  );
  const view = await render(tree(), { language: 'en', theme: 'dark' });
  return { repository, client, tree, ...view };
}

describe('habit details and corrections', () => {
  it('schedules frequency and quantity changes next week while preserving today and historical goals', async () => {
    const { repository } = await open();
    repository.edit.mockImplementation(async (input) => {
      const planned = {
        ...habit.definition,
        id: '31000000-0000-4000-8000-000000000009',
        effectiveFrom: '2026-10-26',
        scheduleType: 'weekly' as const,
        weeklyTarget: 3,
        measurementMode: 'quantity' as const,
        targetMilliunits: 30000,
        unitLabel: 'pages',
      };
      repository.findById.mockResolvedValue({
        ...habit,
        name: input.name,
        definitionHistory: [habit.definition, planned],
        updatedAt: '2026-10-21T14:00:00Z',
      });
      return { effectiveFrom: planned.effectiveFrom };
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit habit' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'New reading name',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Days per week, without fixed days' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Different days per week'),
      '3',
    );
    await fireEvent.changeText(screen.getByLabelText('Minimum per day'), '30');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(screen.queryByLabelText('Habit name')).not.toBeOnTheScreen(),
    );
    expect(repository.edit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New reading name',
        scheduleType: 'weekly',
        weeklyTarget: 3,
        targetMilliunits: 30000,
        expectedUpdatedAt: habit.updatedAt,
      }),
    );
    expect(repository.rename).not.toHaveBeenCalled();
    expect(
      screen.getByText('Change scheduled for Monday, October 26, 2026'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Goal: 20 pages / day')).toBeOnTheScreen();
    expect(screen.getByText('Goal: 30 pages / day')).toBeOnTheScreen();
    expect(screen.getAllByText('Confirmed: 5 / 20 pages')).not.toHaveLength(0);
  });
  beforeEach(() => {
    mockToday = '2026-10-21';
    mockDate = undefined;
  });
  it('shows real periods, dates without records and confirmed correction values', async () => {
    const { repository } = await open();
    await screen.findByRole('image');
    expect(
      screen.getByRole('tab', { name: 'Year', selected: true }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Month' }));
    await screen.findByRole('image');
    expect(repository.readDays).toHaveBeenCalledWith(
      [habit.id],
      '2026-09-28',
      '2026-10-25',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'View all dates' }),
    );
    expect(
      screen.getAllByText('No saved record for this date.'),
    ).not.toHaveLength(0);
    await fireEvent.press(
      screen.getByRole('button', { name: 'View or correct record' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Correct the daily total' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Daily total (pages)'),
      '24',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Set total' }));
    await screen.findByText('Saved and confirmed.');
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'set_total',
        expectedRevision: 2,
        amountMilliunits: 24000,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getAllByText('Confirmed: 24 / 20 pages')).toHaveLength(2);
  });
  it('keeps old records read-only', async () => {
    mockDate = '2026-10-01';
    await open();
    await screen.findByRole('image');
    await fireEvent.press(
      screen.getByRole('button', { name: 'View or correct record' }),
    );
    await screen.findByText(
      'Read only. New records and corrections require an eligible date from today or the previous seven days.',
    );
    expect(screen.getByRole('button', { name: 'Set total' })).toBeDisabled();
    expect(screen.queryByLabelText('Habit name')).not.toBeOnTheScreen();
  });
  it('renames the habit and refreshes the confirmed detail', async () => {
    const { repository } = await open();
    repository.rename.mockImplementation(async (input) => {
      repository.findById.mockResolvedValue({
        ...habit,
        name: input.name,
        updatedAt: '2026-10-21T14:00:00Z',
      });
    });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit habit' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'Renamed reading',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(screen.queryByLabelText('Habit name')).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByRole('header', { name: 'Renamed reading' }),
    ).toBeOnTheScreen();
    expect(repository.rename).toHaveBeenCalledWith(
      expect.objectContaining({
        habitId: habit.id,
        name: 'Renamed reading',
        expectedUpdatedAt: habit.updatedAt,
      }),
    );
  });
  it('keeps an uncertain rename through a background read failure and retries the same payload', async () => {
    const { repository, client } = await open();
    repository.rename.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit habit' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'Kept draft',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Retry the same save' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    repository.findById.mockRejectedValueOnce(new OperationError('network'));
    await act(async () => {
      await client.invalidateQueries({
        queryKey: ['habits', mockUserId, 'detail'],
      });
    });
    expect(screen.getByDisplayValue('Kept draft')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry the same save' }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Habit name')).not.toBeOnTheScreen(),
    );
    expect(repository.rename.mock.calls[0]?.[0]).toEqual(
      repository.rename.mock.calls[1]?.[0],
    );
  });
  it('requires review after a name conflict while preserving the draft', async () => {
    const { repository } = await open();
    repository.rename.mockRejectedValueOnce(new OperationError('conflict'));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit habit' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Habit name'),
      'My correction',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Reload current state' });
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeOnTheScreen();
    const updatedAt = '2026-10-21T14:00:00Z';
    repository.findById.mockResolvedValue({
      ...habit,
      name: 'Another device',
      updatedAt,
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    await screen.findByText('Saved name: Another device');
    expect(screen.getByDisplayValue('My correction')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(repository.rename).toHaveBeenCalledTimes(2));
    expect(repository.rename.mock.calls[1]?.[0].expectedUpdatedAt).toBe(
      updatedAt,
    );
    expect(repository.rename.mock.calls[0]?.[0].operationId).not.toBe(
      repository.rename.mock.calls[1]?.[0].operationId,
    );
  });
  it('does not present failed batches as empty history and recovers', async () => {
    await open((repository) =>
      repository.readDays.mockRejectedValueOnce(new OperationError('network')),
    );
    await screen.findByRole('alert');
    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        'No records in this period. Use the date controls to inspect a day.',
      ),
    ).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('image');
  });
  it('preserves a pending correction across midnight and retries the same operation', async () => {
    const { repository, tree, rerender } = await open();
    await screen.findByRole('image');
    await fireEvent.press(
      screen.getByRole('button', { name: 'View or correct record' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Correct the daily total' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Daily total (pages)'),
      '24',
    );
    repository.record.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(screen.getByRole('button', { name: 'Set total' }));
    await screen.findByRole('button', { name: 'Retry the same save' });
    mockToday = '2026-10-22';
    await rerender(tree());
    expect(screen.getByDisplayValue('24')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry the same save' }),
    );
    await screen.findByText('Saved and confirmed.');
    expect(repository.record.mock.calls[0]?.[0]).toEqual(
      repository.record.mock.calls[1]?.[0],
    );
    expect(repository.record.mock.calls[1]?.[0].date).toBe('2026-10-21');
  });
  it('rejects an invalid route date before reading records', async () => {
    mockDate = '2026-02-30';
    const { repository } = await open();
    await screen.findByRole('alert');
    expect(repository.readDays).not.toHaveBeenCalled();
  });
  it('handles a missing habit explicitly', async () => {
    await open((repository) => repository.findById.mockResolvedValue(null));
    await waitFor(() => expect(screen.getByRole('alert')).toBeOnTheScreen());
    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
  });
});
