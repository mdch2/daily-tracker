import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardGoals } from '@/features/goals/presentation/dashboard-goals';
import { GoalRepositoryContext } from '@/features/goals/presentation/goal-context';
import { OperationError } from '@/shared/domain/operation-error';
import {
  goalPage,
  goalRead,
  goalRepositoryStub,
} from './helpers/goal-fixtures';
import { render } from './helpers/render-localized';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: 'synthetic-user' } } }),
}));
async function open(
  repository = goalRepositoryStub(),
  language: 'en' | 'es' = 'en',
  theme: 'light' | 'dark' | 'system' = 'light',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <GoalRepositoryContext.Provider value={repository}>
        <DashboardGoals today="2026-10-21" />
      </GoalRepositoryContext.Provider>
    </QueryClientProvider>,
    { language, theme },
  );
  return { ...view, repository, client };
}
beforeEach(() => mockPush.mockClear());
it.each([
  ['es', 'light'],
  ['en', 'dark'],
  ['es', 'system'],
] as const)(
  'shows the confirmed progress and opens goal details in %s/%s',
  async (language, theme) => {
    await open(undefined, language, theme);
    expect(await screen.findByText(goalRead.definition.name)).toBeOnTheScreen();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      40,
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: new RegExp(goalRead.definition.name),
      }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/goals/[id]',
      params: { id: goalRead.definition.id },
    });
  },
);
it('shows up to three goals with overdue goals first and reads only the first filtered pages', async () => {
  const repository = goalRepositoryStub();
  const overdue = {
    ...goalRead,
    state: 'overdue' as const,
    definition: {
      ...goalRead.definition,
      id: 'overdue',
      name: 'Overdue synthetic',
    },
  };
  repository.list.mockImplementation(async (state) => ({
    ...goalPage,
    goals:
      state === 'overdue'
        ? [overdue]
        : [1, 2, 3, 4].map((i) => ({
            ...goalRead,
            definition: {
              ...goalRead.definition,
              id: String(i),
              name: `Synthetic ${i}`,
            },
          })),
  }));
  await open(repository);
  await screen.findByText('Overdue synthetic');
  expect(
    screen
      .getAllByRole('progressbar')
      .map((node) => node.props.accessibilityLabel),
  ).toEqual(['Overdue synthetic', 'Synthetic 1', 'Synthetic 2']);
  expect(repository.list.mock.calls).toEqual([
    ['overdue', null],
    ['in_progress', null],
  ]);
  await fireEvent.press(screen.getByRole('button', { name: 'View all goals' }));
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/goals');
});
it('distinguishes a failed read from an empty account and recovers on retry', async () => {
  const repository = goalRepositoryStub();
  repository.list.mockRejectedValue(new OperationError('network'));
  await open(repository);
  await screen.findByRole('alert');
  expect(
    screen.queryByText('You have no goals in progress or overdue.'),
  ).not.toBeOnTheScreen();
  expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  repository.list.mockResolvedValue(goalPage);
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('progressbar')).toBeOnTheScreen();
});
it('offers creation when both successful pages are empty', async () => {
  const repository = goalRepositoryStub();
  repository.list.mockResolvedValue({ ...goalPage, goals: [] });
  await open(repository);
  expect(
    await screen.findByText('You have no goals in progress or overdue.'),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'New goal' }));
  expect(mockPush).toHaveBeenCalledWith('/goals/new');
});
it('refreshes home progress through the same invalidation used by goal and linked-habit writes', async () => {
  const { repository, client } = await open();
  await screen.findByRole('progressbar');
  repository.list.mockResolvedValue({
    ...goalPage,
    goals: [
      {
        ...goalRead,
        progress: {
          available: true,
          accumulatedMilliunits: 60000,
          completedMilestones: null,
          totalMilestones: null,
          percentage: 60,
        },
      },
    ],
  });
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['goals'] });
  });
  await waitFor(() =>
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      60,
    ),
  );
});
