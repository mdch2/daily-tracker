import {
  canRecordGoal,
  goalPercentage,
  goalState,
} from '@/features/goals/domain/goal-rules';
import {
  createGoalActions,
  createGoalSchema,
} from '@/features/goals/application/goal-actions';
import {
  goalDefinition,
  goalId,
  goalMilestoneId,
  goalOperationId,
  goalRepositoryStub,
} from './helpers/goal-fixtures';

const base = {
  goalId,
  operationId: goalOperationId,
  name: 'Synthetic goal',
  description: null,
  reward: null,
  startDate: '2026-10-21',
  deadline: null,
};
describe('goal rules and write validation', () => {
  it('normalizes optional rewards and counts Unicode characters consistently', () => {
    const input = {
      ...base,
      mode: 'amount',
      progressSource: 'manual',
      unitLabel: 'units',
      targetMilliunits: 1000,
    };
    expect(
      createGoalSchema.parse({ ...input, reward: '   ' }).reward,
    ).toBeNull();
    expect(
      createGoalSchema.parse({ ...input, reward: '  Synthetic reward  ' })
        .reward,
    ).toBe('Synthetic reward');
    expect(
      createGoalSchema.safeParse({ ...input, reward: '🎁'.repeat(400) })
        .success,
    ).toBe(true);
    expect(
      createGoalSchema.safeParse({ ...input, reward: '🎁'.repeat(401) })
        .success,
    ).toBe(false);
  });
  it('applies seven prior calendar dates to quantity only', () => {
    expect(canRecordGoal(goalDefinition, '2026-10-14', '2026-10-21')).toBe(
      true,
    );
    expect(canRecordGoal(goalDefinition, '2026-10-13', '2026-10-21')).toBe(
      false,
    );
    expect(canRecordGoal(goalDefinition, '2026-10-22', '2026-10-21')).toBe(
      false,
    );
    expect(
      canRecordGoal(
        { ...goalDefinition, mode: 'milestones' },
        '2026-10-01',
        '2026-10-21',
      ),
    ).toBe(true);
    expect(
      canRecordGoal(
        { ...goalDefinition, mode: 'milestones' },
        '2026-09-30',
        '2026-10-21',
      ),
    ).toBe(false);
  });
  it('never offers manual recording on archived or linked goals', () => {
    expect(
      canRecordGoal(
        { ...goalDefinition, archivedAt: '2026-10-21T17:00:00Z' },
        '2026-10-21',
        '2026-10-21',
      ),
    ).toBe(false);
    expect(
      canRecordGoal(
        { ...goalDefinition, progressSource: 'habit' },
        '2026-10-21',
        '2026-10-21',
      ),
    ).toBe(false);
  });
  it('prioritizes lifecycle and does not expire on the deadline itself', () => {
    expect(
      goalState(
        { ...goalDefinition, deadline: '2026-10-21' },
        '2026-10-21',
        false,
      ),
    ).toBe('in_progress');
    expect(
      goalState(
        { ...goalDefinition, deadline: '2026-10-20' },
        '2026-10-21',
        false,
      ),
    ).toBe('overdue');
    expect(
      goalState(
        { ...goalDefinition, deadline: '2026-10-20' },
        '2026-10-21',
        true,
      ),
    ).toBe('achieved');
    expect(
      goalState(
        { ...goalDefinition, startDate: '2026-10-22' },
        '2026-10-21',
        false,
      ),
    ).toBe('scheduled');
    expect(
      goalState(
        {
          ...goalDefinition,
          archivedAt: '2026-10-21T17:00:00Z',
          startDate: '2026-10-22',
        },
        '2026-10-21',
        true,
      ),
    ).toBe('archived');
  });
  it('floors percentages, preserves the achievement boundary and rejects empty denominators', () => {
    expect(goalPercentage(2, 3)).toBe(66);
    expect(goalPercentage(999999999998, 999999999999)).toBe(99);
    expect(goalPercentage(120, 100)).toBe(100);
    expect(() => goalPercentage(0, 0)).toThrow();
  });
  it('accepts 400 Unicode code points, normalizes blank description and rejects 401', () => {
    const input = {
      ...base,
      mode: 'amount',
      progressSource: 'manual',
      targetMilliunits: 1000,
      unitLabel: 'units',
    };
    expect(
      createGoalSchema.safeParse({ ...input, description: '😀'.repeat(400) })
        .success,
    ).toBe(true);
    expect(
      createGoalSchema.safeParse({ ...input, description: 'a'.repeat(401) })
        .success,
    ).toBe(false);
    expect(
      createGoalSchema.parse({ ...input, description: '   ' }).description,
    ).toBeNull();
  });
  it('does not accept mixed sources, structural extras or nonintegral day targets', () => {
    expect(
      createGoalSchema.safeParse({
        ...base,
        mode: 'amount',
        progressSource: 'manual',
        targetMilliunits: 1000,
        unitLabel: 'units',
        habitId: goalId,
      }).success,
    ).toBe(false);
    expect(
      createGoalSchema.safeParse({
        ...base,
        mode: 'amount',
        progressSource: 'habit',
        targetMilliunits: 1500,
        habitId: goalId,
        linkedMetric: 'completed_days',
      }).success,
    ).toBe(false);
    expect(
      createGoalSchema.safeParse({
        ...base,
        deadline: '2026-10-20',
        mode: 'amount',
        progressSource: 'manual',
        targetMilliunits: 1000,
        unitLabel: 'units',
      }).success,
    ).toBe(false);
  });
  it('requires increasing, compatible thresholds and stable unique milestone identities', () => {
    const input = {
      ...base,
      mode: 'milestones',
      progressSource: 'habit',
      habitId: goalId,
      linkedMetric: 'completed_days',
      milestones: [
        { id: goalMilestoneId, name: 'First', thresholdMilliunits: 5000 },
        { id: goalOperationId, name: 'Second', thresholdMilliunits: 10000 },
      ],
    };
    expect(createGoalSchema.safeParse(input).success).toBe(true);
    expect(
      createGoalSchema.safeParse({
        ...input,
        milestones: [...input.milestones].reverse(),
      }).success,
    ).toBe(false);
    expect(
      createGoalSchema.safeParse({
        ...input,
        milestones: [input.milestones[0], input.milestones[0]],
      }).success,
    ).toBe(false);
  });
  it('validates at the application write boundary before calling persistence', async () => {
    const repository = goalRepositoryStub();
    const actions = createGoalActions(repository);
    expect(() =>
      actions.recordAmount({
        operationId: goalOperationId,
        goalId,
        date: '2026-10-21',
        action: 'add',
        amountMilliunits: 0,
      }),
    ).toThrow('invalidInput');
    expect(repository.recordAmount).not.toHaveBeenCalled();
    await actions.recordAmount({
      operationId: goalOperationId,
      goalId,
      date: '2026-10-21',
      action: 'set',
      amountMilliunits: 0,
      expectedRevision: 1,
    });
    expect(repository.recordAmount).toHaveBeenCalledTimes(1);
    expect(() =>
      actions.recordMilestone({
        operationId: goalOperationId,
        goalId,
        milestoneId: goalMilestoneId,
        completed: false,
        completionDate: '2026-10-21',
        expectedRevision: 1,
      }),
    ).toThrow('invalidInput');
  });
});
