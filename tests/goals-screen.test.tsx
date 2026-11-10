import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoalsScreen } from '@/features/goals/presentation/goals-screen';
import { CreateGoalScreen } from '@/features/goals/presentation/create-goal-screen';
import { GoalDetailScreen } from '@/features/goals/presentation/goal-detail-screen';
import { GoalRepositoryContext } from '@/features/goals/presentation/goal-context';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import { repositoryStub, habit } from './helpers/habit-fixtures';
import en from '@/shared/i18n/locales/en.json';
import es from '@/shared/i18n/locales/es.json';
import {
  goalContext,
  goalId,
  goalMilestoneId,
  goalRead,
  goalRepositoryStub,
} from './helpers/goal-fixtures';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockParams = { id: goalId };
jest.mock('expo-router', () => ({
  usePreventRemove: () => jest.fn(),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: 'synthetic-goal-user' } } }),
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
  configure?: (repository: ReturnType<typeof goalRepositoryStub>) => void,
) {
  const repository = goalRepositoryStub();
  configure?.(repository);
  const habits = repositoryStub();
  habits.list.mockResolvedValue({ habits: [habit], hasMore: false });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={habits}>
        <GoalRepositoryContext.Provider value={repository}>
          {component}
        </GoalRepositoryContext.Provider>
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>,
    { language, theme },
  );
  return { ...view, repository, client };
}
async function fillAmount() {
  await fireEvent.changeText(
    screen.getByLabelText('Goal name'),
    'Synthetic reading',
  );
  await fireEvent.changeText(screen.getByLabelText('Unit'), 'books');
  await fireEvent.changeText(screen.getByLabelText('Target quantity'), '12');
}
describe('goal screens and confirmed writes', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
  });
  it.each([
    ['en', 'light', en],
    ['es', 'dark', es],
  ] as const)(
    'separates record loading and failure from read-only eligibility in %s',
    async (language, theme, labels) => {
      let rejectRead!: (error: Error) => void;
      const pending = new Promise<never>((_, reject) => {
        rejectRead = reject;
      });
      const { repository } = await open(
        <GoalDetailScreen />,
        language,
        theme,
        (repository) => {
          repository.readContributions.mockImplementation((_id, from, to) =>
            from === to
              ? pending
              : Promise.resolve({ context: goalContext, days: [] }),
          );
        },
      );
      await fireEvent.press(
        await screen.findByRole('button', { name: labels.goals.record }),
      );
      expect(screen.getByText(labels.goals.loadingRecord)).toBeOnTheScreen();
      expect(screen.queryByText(labels.goals.readOnly)).not.toBeOnTheScreen();
      expect(
        screen.queryByText(labels.goals.recordDateUnavailable),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: labels.goals.save }),
      ).toBeDisabled();
      await fireEvent.changeText(
        screen.getByLabelText(labels.goals.amountLabel),
        '42',
      );
      await act(async () => {
        rejectRead(new OperationError('network'));
      });
      const retry = await screen.findByRole('button', {
        name: labels.goals.retryRecord,
      });
      expect(screen.queryByText(labels.goals.readOnly)).not.toBeOnTheScreen();
      expect(
        screen.queryByText(labels.goals.recordDateUnavailable),
      ).not.toBeOnTheScreen();
      expect(screen.getByDisplayValue('42')).toBeOnTheScreen();
      repository.readContributions.mockResolvedValue({
        context: goalContext,
        days: [],
      });
      await fireEvent.press(retry);
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: labels.goals.save }),
        ).toBeEnabled(),
      );
      expect(
        screen.queryByText(labels.goals.loadingRecord),
      ).not.toBeOnTheScreen();
      expect(screen.getByDisplayValue('42')).toBeOnTheScreen();
      expect(repository.recordAmount).not.toHaveBeenCalled();
    },
    // Initial native rendering plus deferred read/retry can exceed 5s on Windows.
    15000,
  );
  it('saves the optional personal reward with the goal', async () => {
    const { repository } = await open(<CreateGoalScreen />);
    await fillAmount();
    await fireEvent.changeText(
      screen.getByLabelText('My reward (optional)'),
      '  Synthetic cinema evening  ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ reward: 'Synthetic cinema evening' }),
      ),
    );
  });
  it('shows the reward length error next to the field and retains its draft', async () => {
    const { repository } = await open(<CreateGoalScreen />);
    await fillAmount();
    await fireEvent.changeText(
      screen.getByLabelText('My reward (optional)'),
      'a'.repeat(401),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use no more than 400 characters.',
    );
    expect(screen.getByDisplayValue('a'.repeat(401))).toBeOnTheScreen();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('highlights the reward only while the confirmed goal is achieved', async () => {
    const { repository, client } = await open(
      <GoalDetailScreen />,
      'en',
      'dark',
      (repository) =>
        repository.findById.mockResolvedValue({
          context: goalContext,
          goal: {
            ...goalRead,
            state: 'achieved',
            definition: { ...goalRead.definition, reward: 'Synthetic reward' },
            progress: {
              available: true,
              accumulatedMilliunits: 100000,
              completedMilestones: null,
              totalMilestones: null,
              percentage: 100,
            },
          },
        }),
    );
    expect(
      await screen.findByText('Goal achieved! Enjoy your reward'),
    ).toBeOnTheScreen();
    repository.findById.mockResolvedValue({
      context: goalContext,
      goal: {
        ...goalRead,
        definition: { ...goalRead.definition, reward: 'Synthetic reward' },
      },
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['goals'] });
    });
    expect(await screen.findByText('My reward')).toBeOnTheScreen();
    expect(
      screen.queryByText('Goal achieved! Enjoy your reward'),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Synthetic reward')).toBeOnTheScreen();
  });
  it('clears an existing reward through a versioned edit', async () => {
    const { repository } = await open(
      <GoalDetailScreen />,
      'en',
      'light',
      (repository) =>
        repository.findById.mockResolvedValue({
          context: goalContext,
          goal: {
            ...goalRead,
            definition: { ...goalRead.definition, reward: 'Synthetic reward' },
          },
        }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit goal' }),
    );
    expect(screen.getByDisplayValue('Synthetic reward')).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('My reward (optional)'),
      '   ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(repository.edit).toHaveBeenCalledWith(
        expect.objectContaining({ reward: null, expectedVersion: 1 }),
      ),
    );
  });
  it('asks before discarding a goal draft and keeps it after cancelling', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    await open(<CreateGoalScreen />);
    await fillAmount();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to goals' }),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(alert.mock.calls[0]?.[0]).toBe('Discard changes?');
    expect(screen.getByDisplayValue('Synthetic reading')).toBeOnTheScreen();
    alert.mockRestore();
  });
  it.each([
    ['es', 'light'],
    ['en', 'light'],
    ['es', 'dark'],
    ['en', 'dark'],
    ['es', 'system'],
    ['en', 'system'],
  ] as const)(
    'shows confirmed accessible progress in %s / %s',
    async (language, theme) => {
      const { repository } = await open(<GoalsScreen />, language, theme);
      expect(await screen.findByText('Synthetic savings')).toBeOnTheScreen();
      expect(
        screen.getByRole('progressbar', { name: 'Synthetic savings' }).props
          .accessibilityValue.now,
      ).toBe(40);
      expect(repository.list).toHaveBeenCalledWith(null, null);
    },
  );
  it('does not replace a failed list with an empty state', async () => {
    await open(<GoalsScreen />, 'en', 'light', (repository) =>
      repository.list.mockRejectedValue(new OperationError('network')),
    );
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(
      screen.queryByText(
        'No goals match this filter. Create a goal to get started.',
      ),
    ).not.toBeOnTheScreen();
  });
  it('keeps confirmed goals visible while refreshing', async () => {
    const { repository } = await open(<GoalsScreen />);
    await screen.findByText('Synthetic savings');
    let resolveRefresh!: (
      value: Awaited<ReturnType<typeof repository.list>>,
    ) => void;
    repository.list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh' }));
    expect(screen.getByText('Synthetic savings')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Synthetic savings' }),
    ).toBeOnTheScreen();
    await act(async () => {
      resolveRefresh(await goalRepositoryStub().list(null, null));
    });
    expect(await screen.findByText('Synthetic savings')).toBeOnTheScreen();
  });
  it('creates a quantity goal and navigates only after confirmed saving', async () => {
    const { repository } = await open(<CreateGoalScreen />);
    await fillAmount();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/goals/[id]' }),
      ),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Synthetic reading',
        unitLabel: 'books',
        mode: 'amount',
        progressSource: 'manual',
        targetMilliunits: 12000,
        startDate: '2026-10-21',
        description: null,
      }),
    );
  });
  it('preserves the exact uncertain operation and draft through language/theme changes', async () => {
    const view = await open(<CreateGoalScreen />, 'en', 'light', (repository) =>
      repository.create.mockRejectedValueOnce(new OperationError('network')),
    );
    await fillAmount();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Retry the same save' });
    const request = view.repository.create.mock.calls[0]?.[0];
    await act(async () => {
      await view.preferenceStore
        .getState()
        .update({ language: 'es', theme: 'dark' });
    });
    expect(screen.getByDisplayValue('Synthetic reading')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reintentar el mismo guardado' }),
    );
    await waitFor(() =>
      expect(view.repository.create).toHaveBeenCalledTimes(2),
    );
    expect(view.repository.create.mock.calls[1]?.[0]).toEqual(request);
  });
  it('does not resend a confirmed creation if refreshing fails', async () => {
    const { repository, client } = await open(<CreateGoalScreen />);
    jest
      .spyOn(client, 'invalidateQueries')
      .mockRejectedValueOnce(new OperationError('network'));
    await fillAmount();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText(
      'Saved and confirmed, but the latest state could not be loaded. Reload before recording again.',
    );
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
  it('rejects descriptions over 400 and retains the text for correction', async () => {
    const { repository } = await open(<CreateGoalScreen />);
    await fillAmount();
    await fireEvent.changeText(
      screen.getByLabelText('Description (optional)'),
      'a'.repeat(401),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('a'.repeat(401))).toBeOnTheScreen();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('shows the habit source without manual contribution controls', async () => {
    await open(<GoalDetailScreen />, 'en', 'dark', (repository) =>
      repository.findById.mockResolvedValue({
        context: goalContext,
        goal: {
          ...goalRead,
          definition: {
            ...goalRead.definition,
            progressSource: 'habit',
            habitId: habit.id,
            linkedMetric: 'amount',
          },
          source: {
            habitId: habit.id,
            name: 'Synthetic source habit',
            measurementMode: 'quantity',
            linkedMetric: 'amount',
            unitLabel: 'units',
          },
        },
      }),
    );
    expect(await screen.findByText('Synthetic source habit')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Record progress' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getAllByRole('button', { name: 'Open linked habit' }).length,
    ).toBeGreaterThan(0);
  });
  it('allows correction of an old milestone date without a seven-day cutoff', async () => {
    const { repository } = await open(
      <GoalDetailScreen />,
      'en',
      'light',
      (repository) =>
        repository.findById.mockResolvedValue({
          context: goalContext,
          goal: {
            ...goalRead,
            state: 'achieved',
            definition: {
              ...goalRead.definition,
              mode: 'milestones',
              targetMilliunits: null,
              unitLabel: null,
              milestones: [
                {
                  id: goalMilestoneId,
                  name: 'Synthetic milestone',
                  position: 0,
                  thresholdMilliunits: null,
                },
              ],
            },
            progress: {
              available: true,
              accumulatedMilliunits: null,
              completedMilestones: 1,
              totalMilestones: 1,
              percentage: 100,
            },
            milestoneStates: [
              {
                id: goalMilestoneId,
                completed: true,
                revision: 1,
                completionDate: '2026-10-02',
              },
            ],
          },
        }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Record progress' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Completion date' }),
    );
    await fireEvent(
      screen.getByTestId('date-picker'),
      'valueChange',
      {},
      new Date('2026-10-03T12:00:00Z'),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm selection' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm or update date' }),
    );
    await waitFor(() =>
      expect(repository.recordMilestone).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: goalMilestoneId,
          expectedRevision: 1,
          completionDate: '2026-10-03',
          completed: true,
        }),
      ),
    );
  });
  it('preserves an edit draft through conflict and uses the refreshed version for a new operation', async () => {
    const { repository } = await open(<GoalDetailScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Edit goal' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Goal name'),
      'My preserved goal',
    );
    repository.edit.mockRejectedValueOnce(new OperationError('conflict'));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Reload current state' });
    repository.findById.mockResolvedValue({
      context: goalContext,
      goal: {
        ...goalRead,
        definition: { ...goalRead.definition, name: 'Remote name', version: 2 },
      },
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    expect(await screen.findByText('Current version: 2')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('My preserved goal')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(repository.edit).toHaveBeenCalledTimes(2));
    expect(repository.edit.mock.calls[1]?.[0]).toMatchObject({
      name: 'My preserved goal',
      expectedVersion: 2,
    });
    expect(repository.edit.mock.calls[1]?.[0].operationId).not.toBe(
      repository.edit.mock.calls[0]?.[0].operationId,
    );
  });
});
