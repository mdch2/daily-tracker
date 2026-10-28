import type { ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoutinesScreen } from '@/features/routines/presentation/routines-screen';
import { CreateRoutineScreen } from '@/features/routines/presentation/create-routine-screen';
import { RoutineDetailScreen } from '@/features/routines/presentation/routine-detail-screen';
import { RoutineRepositoryContext } from '@/features/routines/presentation/routine-context';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import {
  routine,
  routineId,
  routineRepositoryStub,
  ownDay,
} from './helpers/routine-fixtures';
import { habit, repositoryStub, day } from './helpers/habit-fixtures';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockParams: { id: string; date?: string } = { id: routineId };
jest.mock('expo-router', () => ({
  usePreventRemove: () => jest.fn(),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: 'synthetic-user' } } }),
}));
jest.mock('@/features/profile/presentation/business-calendar-gate', () => ({
  BusinessCalendarGate: ({
    children,
  }: {
    children: (context: unknown) => ReactNode;
  }) =>
    children({
      configured: true,
      today: '2026-10-21',
      weekStartDate: '2026-10-19',
      weekStartDay: 1,
      timeZone: 'America/Bogota',
    }),
}));

async function open(
  component: ReactNode,
  language: 'en' | 'es' = 'en',
  theme: 'light' | 'dark' | 'system' = 'light',
  configure?: (repository: ReturnType<typeof routineRepositoryStub>) => void,
) {
  const repository = routineRepositoryStub();
  repository.list.mockResolvedValue({ routines: [routine], hasMore: false });
  repository.readDays.mockResolvedValue([ownDay()]);
  configure?.(repository);
  const habits = repositoryStub();
  habits.readDays.mockResolvedValue([day('2026-10-21')]);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={habits}>
        <RoutineRepositoryContext.Provider value={repository}>
          {component}
        </RoutineRepositoryContext.Provider>
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>,
    { language, theme },
  );
  return { ...view, repository, habits, client };
}
describe('routine screens and confirmed writes', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    delete mockParams.date;
  });
  it.each([
    ['es', 'light'],
    ['en', 'dark'],
    ['es', 'system'],
  ] as const)(
    'renders confirmed progress in %s / %s',
    async (language, theme) => {
      await open(<RoutinesScreen />, language, theme);
      expect(await screen.findByText(routine.name)).toBeOnTheScreen();
      expect(
        screen.getByRole('progressbar').props.accessibilityValue,
      ).toMatchObject({ max: 2, now: 2 });
      expect(screen.getByText('Prepare clothes')).toBeOnTheScreen();
      expect(screen.queryByText('12 días racha')).not.toBeOnTheScreen();
    },
  );
  it('keeps creation input and exact request identity after a lost response', async () => {
    const { repository } = await open(
      <CreateRoutineScreen />,
      'en',
      'dark',
      (value) =>
        value.create.mockRejectedValueOnce(new OperationError('network')),
    );
    await fireEvent.changeText(screen.getByLabelText('Routine name'), 'Night');
    await fireEvent.changeText(
      screen.getByLabelText('Name for step 1'),
      'Prepare clothes',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Create routine' }),
    );
    await screen.findByRole('button', { name: 'Retry the same save' });
    expect(screen.getByDisplayValue('Night')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Prepare clothes')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry the same save' }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      repository.create.mock.calls[1]?.[0],
    );
  });
  it('uses the habit writer for a linked step and never writes an own-step copy', async () => {
    const { repository, habits } = await open(<RoutineDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: `Record ${habit.name}` }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Amount to add (pages)'),
      '5',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add contribution' }),
    );
    await waitFor(() =>
      expect(habits.record).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'add_amount', amountMilliunits: 5000 }),
      ),
    );
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('saves a name-only edit without scheduling a structural change', async () => {
    const { repository } = await open(<RoutineDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit routine' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Routine name'),
      'Updated name',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save changes' }),
      ).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(repository.edit).toHaveBeenCalled());
    expect(repository.edit.mock.calls[0]?.[0]).toMatchObject({
      name: 'Updated name',
      expectedUpdatedAt: routine.updatedAt,
    });
    expect(repository.edit.mock.calls[0]?.[0]).not.toHaveProperty(
      'configuration',
    );
  });

  it('shows the latest saved configuration after conflict while preserving the edit draft', async () => {
    const { repository } = await open(<RoutineDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit routine' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Routine name'),
      'My preserved draft',
    );
    repository.edit.mockRejectedValueOnce(new OperationError('conflict'));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save changes' }),
      ).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Reload current state' });
    const first = routine.definitions[0]!;
    repository.findById.mockResolvedValue({
      ...routine,
      name: 'Remote routine name',
      updatedAt: '2026-10-21T13:00:00Z',
      definitions: [
        first,
        {
          ...first,
          id: '27000000-0000-4000-8000-000000000095',
          effectiveFrom: '2026-10-26',
          steps: [
            { ...first.steps[0]!, kind: 'own', title: 'Remote own step' },
          ],
        },
      ],
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    expect(
      await screen.findByText('Latest saved configuration'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Remote own step · Required')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('My preserved draft')).toBeOnTheScreen();
    expect(repository.edit).toHaveBeenCalledTimes(1);
  });

  it('finishes a confirmed edit after reloading without sending the edit again', async () => {
    const { repository, client } = await open(<RoutineDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit routine' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Routine name'),
      'Saved name',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save changes' }),
      ).toBeEnabled(),
    );
    jest
      .spyOn(client, 'invalidateQueries')
      .mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText(
      'Saved and confirmed, but the latest state could not be loaded. Reload before recording again.',
    );
    expect(repository.edit).toHaveBeenCalledTimes(1);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Routine name')).not.toBeOnTheScreen(),
    );
    expect(repository.edit).toHaveBeenCalledTimes(1);
  });
  it('blocks own-step writing on earlier dates while retaining history inspection', async () => {
    mockParams.date = '2026-10-20';
    const { repository } = await open(<RoutineDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Inspect Prepare my desk' }),
    );
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeDisabled();
    expect(repository.record).not.toHaveBeenCalled();
  });
  it('does not render failed reads as an empty routine list', async () => {
    await open(<RoutinesScreen />, 'en', 'light', (repository) =>
      repository.list.mockRejectedValue(new OperationError('network')),
    );
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(
      screen.queryByText('Your first routine starts with a small step.'),
    ).not.toBeOnTheScreen();
  });
});
