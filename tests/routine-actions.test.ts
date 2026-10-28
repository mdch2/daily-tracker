import { createRoutineActions } from '@/features/routines/application/routine-actions';
import { readRoutineWindow } from '@/features/routines/application/read-routine-window';
import { readRoutineOverview } from '@/features/routines/application/read-routine-overview';
import { OperationError } from '@/shared/domain/operation-error';
import {
  routine,
  routineId,
  ownStepId,
  routineRepositoryStub,
} from './helpers/routine-fixtures';
import { repositoryStub, habitId } from './helpers/habit-fixtures';

const input = {
  id: routineId,
  name: '  Morning  ',
  scheduleType: 'daily' as const,
  steps: [
    { id: ownStepId, kind: 'own' as const, title: '  Desk  ', required: true },
  ],
};
describe('routine application boundary', () => {
  it('trims input and rejects invalid definitions without writing', async () => {
    const repository = routineRepositoryStub();
    const actions = createRoutineActions(repository);
    await actions.create(input);
    expect(repository.create).toHaveBeenCalledWith({
      ...input,
      name: 'Morning',
      steps: [{ ...input.steps[0]!, title: 'Desk' }],
    });
    for (const invalid of [
      { ...input, steps: [] },
      { ...input, steps: [{ ...input.steps[0], required: false }] },
      { ...input, steps: [input.steps[0], input.steps[0]] },
      { ...input, scheduleType: 'weekly' },
      { ...input, scheduleType: 'weekdays', weekdayMask: 0 },
    ])
      expect(() => actions.create(invalid)).toThrow('invalidInput');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
  it('rejects a repeated linked habit and preserves exact operation identity', async () => {
    const repository = routineRepositoryStub();
    const actions = createRoutineActions(repository);
    expect(() =>
      actions.create({
        ...input,
        steps: [
          { id: ownStepId, kind: 'habit', habitId, required: true },
          { id: routineId, kind: 'habit', habitId, required: false },
        ],
      }),
    ).toThrow('invalidInput');
    const record = {
      operationId: habitId,
      routineId,
      stepId: ownStepId,
      date: '2026-10-21',
      completed: false,
      expectedRevision: 1,
    };
    await actions.record(record);
    expect(repository.record).toHaveBeenCalledWith(record);
  });
  it('reads only linked origins once and propagates failure without a partial summary', async () => {
    const repository = routineRepositoryStub();
    const habits = repositoryStub();
    await readRoutineWindow(
      repository,
      habits,
      [routine, routine],
      '2026-10-21',
      '2026-10-21',
    );
    expect(habits.findById).toHaveBeenCalledTimes(1);
    expect(habits.readDays).toHaveBeenCalledWith(
      [habitId],
      '2026-10-21',
      '2026-10-21',
    );
    habits.findById.mockResolvedValueOnce(null);
    await expect(
      readRoutineWindow(
        repository,
        habits,
        [routine],
        '2026-10-21',
        '2026-10-21',
      ),
    ).rejects.toThrow('service');
    await expect(
      readRoutineWindow(
        repository,
        habits,
        [routine, routine],
        '2026-10-20',
        '2026-10-21',
      ),
    ).rejects.toThrow('invalidInput');
  });
  it('reads every page and archived routines for past dates before publishing an overview', async () => {
    const repository = routineRepositoryStub();
    const habits = repositoryStub();
    repository.list
      .mockResolvedValueOnce({ routines: [routine], hasMore: true })
      .mockResolvedValueOnce({ routines: [], hasMore: false })
      .mockResolvedValueOnce({ routines: [], hasMore: false });
    const value = await readRoutineOverview(
      repository,
      habits,
      '2026-10-21',
      '2026-10-22',
    );
    expect(value.routines).toHaveLength(1);
    expect(repository.list.mock.calls).toEqual([
      [0, false],
      [20, false],
      [0, true],
    ]);
    repository.list.mockRejectedValueOnce(new OperationError('network'));
    await expect(
      readRoutineOverview(repository, habits, '2026-10-21', '2026-10-21'),
    ).rejects.toThrow('network');
  });
});
