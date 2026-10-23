import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OperationError } from '@/shared/domain/operation-error';
import { HabitDayEditor } from '@/features/habits/presentation/habit-day-editor';
import { HabitRepositoryContext } from '@/features/habits/presentation/habit-context';
import { render } from './helpers/render-localized';
import { habit, day, repositoryStub } from './helpers/habit-fixtures';

jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));

async function open(language: 'es' | 'en' = 'en', today = '2026-10-21') {
  const repository = repositoryStub();
  const refresh = jest.fn(async () => [day('2026-10-21', 1000000, 4)]);
  const onLock = jest.fn();
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <HabitRepositoryContext.Provider value={repository}>
        <HabitDayEditor
          habit={habit}
          date="2026-10-21"
          today={today}
          record={day('2026-10-21', 500000, 2)}
          refresh={refresh}
          onLock={onLock}
        />
      </HabitRepositoryContext.Provider>
    </QueryClientProvider>,
    { language, theme: 'dark' },
  );
  return { ...view, repository, refresh, onLock };
}
describe('confirmed habit editing', () => {
  it.each(['en', 'es'] as const)(
    'retries the same action and keeps input in %s',
    async (language) => {
      const { repository, refresh } = await open(language);
      repository.record.mockRejectedValueOnce(new OperationError('network'));
      const input = language === 'en' ? 'Amount' : 'Cantidad';
      await fireEvent.changeText(screen.getByLabelText(input), '250');
      await fireEvent.press(
        screen.getByRole('button', {
          name: language === 'en' ? 'Add contribution' : 'Añadir aporte',
        }),
      );
      const retry = await screen.findByRole('button', {
        name:
          language === 'en'
            ? 'Retry the same save'
            : 'Reintentar el mismo guardado',
      });
      expect(screen.getByDisplayValue('250')).toBeOnTheScreen();
      expect(refresh).not.toHaveBeenCalled();
      await fireEvent.press(retry);
      await screen.findByText(
        language === 'en' ? 'Saved and confirmed.' : 'Guardado confirmado.',
      );
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(repository.record.mock.calls[0]?.[0]).toEqual(
        repository.record.mock.calls[1]?.[0],
      );
      await fireEvent.changeText(screen.getByLabelText(input), '750');
      await fireEvent.press(
        screen.getByRole('button', {
          name: language === 'en' ? 'Set total' : 'Fijar total',
        }),
      );
      await waitFor(() => expect(repository.record).toHaveBeenCalledTimes(3));
      expect(repository.record.mock.calls[2]?.[0]).toMatchObject({
        kind: 'set_total',
        expectedRevision: 4,
        amountMilliunits: 750000,
      });
    },
  );
  it('requires a reviewed refresh after a conflict, preserving the correction', async () => {
    const { repository, refresh } = await open();
    repository.record.mockRejectedValueOnce(new OperationError('conflict'));
    await fireEvent.changeText(screen.getByLabelText('Amount'), '750');
    await fireEvent.press(screen.getByRole('button', { name: 'Set total' }));
    await screen.findByRole('alert');
    expect(screen.getByDisplayValue('750')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Set total' })).toBeDisabled();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reload current state' }),
    );
    await screen.findByText(
      'Current state loaded. Review it and confirm your correction again.',
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Set total' }));
    await waitFor(() => expect(repository.record).toHaveBeenCalledTimes(2));
    expect(repository.record.mock.calls[0]?.[0]).toMatchObject({
      expectedRevision: 2,
    });
    expect(repository.record.mock.calls[1]?.[0]).toMatchObject({
      expectedRevision: 4,
    });
    expect(repository.record.mock.calls[0]?.[0].operationId).not.toBe(
      repository.record.mock.calls[1]?.[0].operationId,
    );
  });
  it('keeps a confirmed save distinct from a failed refresh', async () => {
    const { refresh, repository } = await open();
    refresh.mockRejectedValueOnce(new OperationError('network'));
    await fireEvent.changeText(screen.getByLabelText('Amount'), '250');
    await fireEvent.press(
      screen.getByRole('button', { name: 'Add contribution' }),
    );
    await screen.findByText(
      'Saved and confirmed, but the latest state could not be loaded. Reload before recording again.',
    );
    expect(repository.record).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Retry the same save' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Add contribution' }),
    ).toBeDisabled();
  });
  it('shows historical data read-only outside the window', async () => {
    const { repository } = await open('en', '2026-10-29');
    expect(screen.getByRole('button', { name: 'Set total' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Add contribution' }),
    ).toBeDisabled();
    expect(repository.record).not.toHaveBeenCalled();
  });
});
