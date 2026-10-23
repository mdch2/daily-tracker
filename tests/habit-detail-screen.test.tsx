import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
    await fireEvent.changeText(await screen.findByLabelText('Amount'), '24');
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
  it('keeps old records read-only and does not offer configuration changes', async () => {
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
    await fireEvent.changeText(await screen.findByLabelText('Amount'), '24');
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
