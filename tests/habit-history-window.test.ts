import { readHabitWindow } from '@/features/habits/application/read-habit-window';
import { habitHistoryWindow } from '@/features/habits/presentation/habit-history-window';
import { repositoryStub, habitId, day } from './helpers/habit-fixtures';

describe('bounded habit history', () => {
  it('aligns sixteen weeks across a year boundary using the account week start', () => {
    expect(habitHistoryWindow('2027-01-01', 1, 0)).toEqual({
      start: '2026-09-14',
      end: '2027-01-03',
      readTo: '2027-01-01',
    });
    expect(habitHistoryWindow('2027-01-01', 7, 0)).toEqual({
      start: '2026-09-13',
      end: '2027-01-02',
      readTo: '2027-01-01',
    });
    expect(habitHistoryWindow('2027-01-01', 1, 1)).toEqual({
      start: '2026-05-25',
      end: '2026-09-13',
      readTo: '2026-09-13',
    });
  });
  it('reads every date exactly once in four batches below the response limit', async () => {
    const repository = repositoryStub();
    const row = day('2026-10-21');
    repository.readDays.mockImplementation(async (_ids, from, to) =>
      row.date >= from && row.date <= to ? [row] : [],
    );
    await expect(
      readHabitWindow(repository, [habitId], '2026-07-06', '2026-10-25'),
    ).resolves.toEqual([row]);
    expect(repository.readDays.mock.calls).toEqual([
      [[habitId], '2026-07-06', '2026-08-02'],
      [[habitId], '2026-08-03', '2026-08-30'],
      [[habitId], '2026-08-31', '2026-09-27'],
      [[habitId], '2026-09-28', '2026-10-25'],
    ]);
  });
  it('fails the entire map if a batch is unavailable', async () => {
    const repository = repositoryStub();
    repository.readDays.mockRejectedValueOnce(
      new Error('Synthetic read failure'),
    );
    await expect(
      readHabitWindow(repository, [habitId], '2026-07-06', '2026-10-25'),
    ).rejects.toThrow('Synthetic read failure');
  });
  it('avoids empty requests and rejects an unbounded range', async () => {
    const repository = repositoryStub();
    await expect(
      readHabitWindow(repository, [], '2026-10-01', '2026-10-21'),
    ).resolves.toEqual([]);
    await expect(
      readHabitWindow(repository, [habitId], '2020-01-01', '2026-10-21'),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    expect(repository.readDays).not.toHaveBeenCalled();
  });
});
