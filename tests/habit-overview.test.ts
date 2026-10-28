import { dailyHabitOverview } from '@/features/habits/domain/habit-overview';
import { readHabitOverview } from '@/features/habits/application/read-habit-overview';
import type { Habit } from '@/features/habits/domain/habit';
import { habit, day, repositoryStub } from './helpers/habit-fixtures';

describe('home habit overview', () => {
  it('counts scheduled daily goals with their historical definition and keeps flexible weekly habits separate', () => {
    const weekly: Habit = {
      ...habit,
      id: 'weekly',
      definition: {
        ...habit.definition,
        scheduleType: 'weekly',
        weeklyTarget: 3,
      },
    };
    const friday: Habit = {
      ...habit,
      id: 'friday',
      definition: {
        ...habit.definition,
        scheduleType: 'weekdays',
        weekdayMask: 16,
      },
    };
    const upcoming: Habit = {
      ...habit,
      id: 'upcoming',
      startDate: '2026-11-01',
    };
    const changed: Habit = {
      ...habit,
      definitionHistory: [
        habit.definition,
        {
          ...habit.definition,
          id: 'next',
          effectiveFrom: '2026-10-26',
          measurementMode: 'quantity',
          targetMilliunits: 30000,
          unitLabel: 'pages',
        },
      ],
    };
    expect(
      dailyHabitOverview(
        [changed, weekly, friday, upcoming],
        [day('2026-10-21')],
        '2026-10-21',
      ),
    ).toMatchObject({
      scheduled: 1,
      completed: 1,
      eligible: [{ id: habit.id }, { id: 'weekly' }],
    });
    expect(
      dailyHabitOverview([changed], [day('2026-10-26')], '2026-10-26'),
    ).toMatchObject({ scheduled: 1, completed: 0 });
  });

  it('does not infer completion from absent, zero or partial quantity records', () => {
    for (const records of [
      [],
      [day('2026-10-21', 0)],
      [day('2026-10-21', 19000)],
    ]) {
      expect(dailyHabitOverview([habit], records, '2026-10-21')).toMatchObject({
        scheduled: 1,
        completed: 0,
      });
    }
    expect(dailyHabitOverview([], [], '2026-10-21')).toMatchObject({
      scheduled: 0,
      completed: 0,
    });
  });

  it('reads every page and batches at most 30 ids before exposing totals', async () => {
    const repository = repositoryStub();
    const first = Array.from({ length: 30 }, (_, index) => ({
      ...habit,
      id: `habit-${index}`,
    }));
    repository.list
      .mockResolvedValueOnce({ habits: first, hasMore: true })
      .mockResolvedValueOnce({
        habits: [{ ...habit, id: 'last' }],
        hasMore: false,
      });
    const result = await readHabitOverview(
      repository,
      '2026-10-19',
      '2026-10-21',
    );
    expect(result.habits).toHaveLength(31);
    expect(repository.list.mock.calls).toEqual([[0], [30]]);
    expect(repository.readDays.mock.calls.map(([ids]) => ids.length)).toEqual([
      30, 1,
    ]);
    expect(repository.readDays).toHaveBeenLastCalledWith(
      ['last'],
      '2026-10-19',
      '2026-10-21',
    );
  });

  it('rejects a failed batch instead of publishing incomplete counts', async () => {
    const repository = repositoryStub();
    repository.readDays.mockRejectedValueOnce(
      new Error('Synthetic read failure'),
    );
    await expect(
      readHabitOverview(repository, '2026-10-19', '2026-10-21'),
    ).rejects.toThrow('Synthetic read failure');
  });
});
