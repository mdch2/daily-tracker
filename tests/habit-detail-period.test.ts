import { habitDetailPeriod } from '@/features/habits/presentation/habit-detail-period';
import { readHabitWindow } from '@/features/habits/application/read-habit-window';
import { repositoryStub, habitId } from './helpers/habit-fixtures';

describe('habit detail periods', () => {
  it('uses account weeks and calendar months, including leap days', () => {
    expect(habitDetailPeriod('2024-03-01', 1, 'week', 0)).toMatchObject({
      start: '2024-02-26',
      end: '2024-03-03',
      weeks: 1,
    });
    expect(habitDetailPeriod('2024-03-01', 7, 'week', 0)).toMatchObject({
      start: '2024-02-25',
      end: '2024-03-02',
    });
    expect(habitDetailPeriod('2024-03-01', 1, 'month', 1)).toMatchObject({
      start: '2024-02-01',
      end: '2024-02-29',
      mapStart: '2024-01-29',
      mapEnd: '2024-03-03',
    });
    expect(habitDetailPeriod('2026-01-01', 1, 'quarter', 0)).toMatchObject({
      start: '2025-11-01',
      end: '2026-01-31',
    });
    expect(habitDetailPeriod('2026-01-01', 1, 'quarter', 1)).toMatchObject({
      start: '2025-08-01',
      end: '2025-10-31',
    });
  });
  it('supports the 54 edge weeks of a leap year for one habit without widening multi-habit queries', async () => {
    const range = habitDetailPeriod('2012-06-01', 1, 'year', 0);
    expect(range).toEqual({
      start: '2012-01-01',
      end: '2012-12-31',
      mapStart: '2011-12-26',
      mapEnd: '2013-01-06',
      weeks: 54,
    });
    const repository = repositoryStub();
    await expect(
      readHabitWindow(repository, [habitId], range.mapStart, range.mapEnd),
    ).resolves.toEqual([]);
    expect(repository.readDays).toHaveBeenCalledTimes(14);
    expect(repository.readDays).toHaveBeenLastCalledWith(
      [habitId],
      '2012-12-24',
      '2013-01-06',
    );
    await expect(
      readHabitWindow(
        repository,
        [habitId, 'another-habit'],
        range.mapStart,
        range.mapEnd,
      ),
    ).rejects.toMatchObject({ code: 'invalidInput' });
  });
});
