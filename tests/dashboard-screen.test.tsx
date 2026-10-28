import type { ReactNode } from 'react';
import * as ReactNative from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardScreen } from '@/features/dashboard/presentation/dashboard-screen';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { RoutineRepositoryContext } from '@/features/routines/presentation/routine-context';
import { routineRepositoryStub } from './helpers/routine-fixtures';
import { ProfileRepositoryContext } from '@/features/profile/presentation/profile-context';
import type { ProfileRepository } from '@/features/profile/domain/profile-repository';
import { OperationError } from '@/shared/domain/operation-error';
import { render } from './helpers/render-localized';
import {
  repositoryStub,
  habit,
  day,
  userId as mockUserId,
} from './helpers/habit-fixtures';

jest.setTimeout(15000);
const mockPush = jest.fn();
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
      today: '2026-10-21',
      weekStartDate: '2026-10-19',
      weekStartDay: 1,
      timeZone: 'America/Bogota',
    }),
}));

async function open(
  configure?: (repository: ReturnType<typeof repositoryStub>) => void,
  language: 'es' | 'en' = 'en',
  theme: 'light' | 'dark' | 'system' = 'light',
) {
  const repository = repositoryStub();
  repository.readDays.mockResolvedValue([day('2026-10-21')]);
  configure?.(repository);
  const profiles: ProfileRepository = {
    findByUserId: async () => ({
      id: mockUserId,
      displayName: 'Alex',
      timeZone: 'America/Bogota',
    }),
    getBusinessContext: jest.fn(),
    initializeHabitCalendar: jest.fn(),
  };
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const ui = () => (
    <QueryClientProvider client={client}>
      <ProfileRepositoryContext.Provider value={profiles}>
        <HabitRepositoryContext.Provider value={repository}>
          <RoutineRepositoryContext.Provider value={routineRepositoryStub()}>
            <DashboardScreen />
          </RoutineRepositoryContext.Provider>
        </HabitRepositoryContext.Provider>
      </ProfileRepositoryContext.Provider>
    </QueryClientProvider>
  );
  const view = await render(ui(), { language, theme });
  return { ...view, repository, client, ui };
}

describe('Stitch home', () => {
  beforeEach(() => mockPush.mockClear());

  it.each([
    ['es', 'light', 'Resumen de hoy'],
    ['en', 'dark', "Today's summary"],
    ['es', 'system', 'Resumen de hoy'],
  ] as const)(
    'renders real goals in %s / %s',
    async (language, theme, title) => {
      await open(undefined, language, theme);
      expect(await screen.findByText(title)).toBeOnTheScreen();
      expect(
        screen.getByRole('progressbar').props.accessibilityValue,
      ).toMatchObject({ min: 0, max: 1, now: 1 });
      expect(screen.getByText(habit.name)).toBeOnTheScreen();
      expect(screen.queryByText('82%')).not.toBeOnTheScreen();
    },
  );

  it('loads, reports a failed read without zero totals and recovers', async () => {
    const { repository } = await open((value) =>
      value.readDays.mockRejectedValueOnce(new OperationError('network')),
    );
    await screen.findByRole('alert');
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('No habits yet. Create your first one.'),
    ).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('progressbar');
    expect(repository.readDays).toHaveBeenCalledTimes(2);
  });

  it('offers creation for an empty account without reading records', async () => {
    const { repository } = await open((value) =>
      value.list.mockResolvedValue({ habits: [], hasMore: false }),
    );
    await screen.findByText('Your consistency starts here');
    expect(repository.readDays).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    expect(mockPush).toHaveBeenCalledWith('/habits/new');
  });

  it('selects historical and future account dates and disables future recording', async () => {
    await open();
    await screen.findByRole('progressbar');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Monday, October 19' }),
    );
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      0,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Sunday, October 25' }),
    );
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /Record Synthetic reading/ }),
    ).toBeDisabled();
  });

  it('filters only the list, preserving the full daily summary, and opens preferences', async () => {
    await open();
    await screen.findByRole('progressbar');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Search habits' }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Search habits'),
      'no match',
    );
    expect(screen.queryByText(habit.name)).not.toBeOnTheScreen();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      1,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close search' }));
    expect(screen.getByText(habit.name)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Language and appearance' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/more');
  });

  it('preserves an uncertain save and draft across appearance/language changes and refreshes the home after confirmation', async () => {
    const { repository, preferenceStore } = await open();
    await screen.findByRole('progressbar');
    await fireEvent.press(
      screen.getByRole('button', { name: /Record Synthetic reading/ }),
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Amount to add (pages)'),
      '2.5',
    );
    repository.record.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add contribution' }),
    );
    await screen.findByRole('button', { name: 'Retry the same save' });
    await act(async () => {
      await preferenceStore
        .getState()
        .update({ language: 'es', theme: 'dark' });
    });
    expect(screen.getByDisplayValue('2.5')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
    repository.readDays.mockResolvedValue([day('2026-10-21', 22500, 2)]);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reintentar el mismo guardado' }),
    );
    await screen.findByText('Guardado confirmado.');
    expect(repository.record.mock.calls[0]?.[0]).toEqual(
      repository.record.mock.calls[1]?.[0],
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByText(/22,5/)).toBeOnTheScreen();
  });

  it('reacts to system appearance changes', async () => {
    const scheme = jest
      .spyOn(ReactNative, 'useColorScheme')
      .mockReturnValue('light');
    try {
      const view = await open(undefined, 'en', 'system');
      await screen.findByText('Light mode');
      scheme.mockReturnValue('dark');
      await view.rerender(view.ui());
      expect(screen.getByText('Dark mode')).toBeOnTheScreen();
    } finally {
      scheme.mockRestore();
    }
  });
});
