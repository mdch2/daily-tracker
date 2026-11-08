import type { BackendClient } from '@/infrastructure/supabase/client';
import { createGoalRepository } from '@/features/goals/infrastructure/supabase-goal-repository';
import { goalContext, goalId, goalOperationId } from './helpers/goal-fixtures';

function fixture() {
  const context = {
    read_at: goalContext.readAt,
    today: goalContext.today,
    time_zone: goalContext.timeZone,
    next_day_at: goalContext.nextDayAt,
  };
  const goal = {
    definition: {
      id: goalId,
      name: 'Synthetic goal',
      description: null,
      reward: null,
      mode: 'amount',
      progress_source: 'manual',
      start_date: '2026-10-01',
      deadline: null,
      time_zone: goalContext.timeZone,
      created_at: '2026-10-01T12:00:00Z',
      updated_at: '2026-10-01T12:00:00Z',
      archived_at: null,
      archived_on: null,
      version: 1,
      unit_label: 'units',
      target_milliunits: 100000,
      habit_id: null,
      linked_metric: null,
      milestones: [],
    },
    state: 'in_progress',
    progress: {
      available: true,
      accumulated_milliunits: 40000,
      completed_milestones: null,
      total_milestones: null,
      percentage: 40,
    },
    source: null,
    milestone_states: [],
  };
  return { context, goal };
}
function setup(data: unknown) {
  const response = jest.fn().mockResolvedValue({ data, error: null });
  const abortSignal = jest.fn();
  const rpc = jest.fn((...args: unknown[]) => {
    const result = response(...args);
    return Object.assign(result, {
      abortSignal: (signal: AbortSignal) => {
        abortSignal(signal);
        return result;
      },
    });
  });
  return {
    rpc,
    response,
    abortSignal,
    repository: createGoalRepository({ rpc } as unknown as BackendClient),
  };
}
describe('goal Supabase contract', () => {
  it('ends an unresponsive read and aborts its transport so it can be retried', async () => {
    jest.useFakeTimers();
    try {
      const { repository, response, abortSignal } = setup(fixture());
      response.mockImplementationOnce(() => new Promise(() => undefined));
      const pending = repository.findById(goalId);
      const failed = expect(pending).rejects.toMatchObject({ code: 'network' });
      await jest.advanceTimersByTimeAsync(15_000);
      await failed;
      expect(abortSignal.mock.calls[0]?.[0].aborted).toBe(true);
      expect((await repository.findById(goalId)).goal?.definition.id).toBe(
        goalId,
      );
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
  it.each([undefined, null, 'Synthetic reward'])(
    'reads historical reward %s while accepting events created before rewards',
    async (reward) => {
      const values = reward === undefined ? {} : { reward };
      const { repository } = setup({
        context: fixture().context,
        events: [
          {
            sequence: 1,
            operation_id: goalOperationId,
            kind: 'edit',
            accepted_at: goalContext.readAt,
            date: null,
            before: values,
            after: values,
          },
        ],
        up_to_sequence: 1,
        next_before_sequence: null,
      });
      const result = await repository.readHistory(goalId, null, null);
      expect(result.events[0]?.after).toEqual(values);
    },
  );
  it('reads personal rewards through the compatible v2 reader', async () => {
    const data = fixture();
    const { repository, rpc } = setup({
      ...data,
      goal: {
        ...data.goal,
        definition: { ...data.goal.definition, reward: 'Synthetic reward' },
      },
    });
    expect((await repository.findById(goalId)).goal?.definition.reward).toBe(
      'Synthetic reward',
    );
    expect(rpc).toHaveBeenCalledWith('get_goal_v2', {
      p_input: { goal_id: goalId },
    });
  });
  it('sends explicit nullable rewards in the versioned creation contract', async () => {
    const { repository, rpc } = setup({
      operation_id: goalOperationId,
      goal_id: goalId,
      kind: 'create',
      accepted_at: goalContext.readAt,
      goal_version: 1,
      event_sequence: 1,
    });
    await repository.create({
      operationId: goalOperationId,
      goalId,
      name: 'Synthetic goal',
      description: null,
      reward: 'Synthetic reward',
      startDate: '2026-10-21',
      deadline: null,
      mode: 'amount',
      progressSource: 'manual',
      unitLabel: 'units',
      targetMilliunits: 1000,
    });
    expect(rpc).toHaveBeenCalledWith('create_goal_v2', {
      p_input: expect.objectContaining({ reward: 'Synthetic reward' }),
    });
  });
  it('clears a reward through a versioned edit without changing the revision contract', async () => {
    const { repository, rpc } = setup({
      operation_id: goalOperationId,
      goal_id: goalId,
      kind: 'edit',
      accepted_at: goalContext.readAt,
      goal_version: 2,
      event_sequence: 2,
    });
    await repository.edit({
      operationId: goalOperationId,
      goalId,
      expectedVersion: 1,
      name: 'Synthetic goal',
      description: null,
      reward: null,
      deadline: null,
      targetMilliunits: 1000,
    });
    expect(rpc).toHaveBeenCalledWith('edit_goal_v2', {
      p_input: expect.objectContaining({ reward: null, expected_version: 1 }),
    });
  });
  it('validates and maps a coherent definition, progress and clock', async () => {
    const { repository } = setup(fixture());
    const result = await repository.findById(goalId);
    expect(result.goal?.definition.progressSource).toBe('manual');
    expect(result.goal?.progress).toEqual({
      available: true,
      accumulatedMilliunits: 40000,
      completedMilestones: null,
      totalMilestones: null,
      percentage: 40,
    });
    expect(result.context.today).toBe('2026-10-21');
  });
  it.each(['percentage', 'identity', 'state', 'source'] as const)(
    'rejects contradictory %s rather than treating it as empty',
    async (contradiction) => {
      const data = fixture();
      if (contradiction === 'percentage') data.goal.progress.percentage = 99;
      if (contradiction === 'identity')
        data.goal.definition.id = goalOperationId;
      if (contradiction === 'state') data.goal.state = 'achieved';
      if (contradiction === 'source')
        data.goal.definition.progress_source = 'habit';
      await expect(
        setup(data).repository.findById(goalId),
      ).rejects.toMatchObject({ code: 'service' });
    },
  );
  it('preserves unavailable detail and maps safe server failures', async () => {
    const { repository, response } = setup({
      context: fixture().context,
      goal: null,
    });
    expect((await repository.findById(goalId)).goal).toBeNull();
    response.mockResolvedValueOnce({ data: null, error: { code: 'GL008' } });
    await expect(repository.findById(goalId)).rejects.toMatchObject({
      code: 'conflict',
    });
    response.mockResolvedValueOnce({ data: null, error: { code: '' } });
    await expect(repository.findById(goalId)).rejects.toMatchObject({
      code: 'network',
    });
  });
  it('requires complete state counts and cursor/filter consistency', async () => {
    const f = fixture();
    const { repository } = setup({
      context: f.context,
      goals: [f.goal],
      counts: {
        archived: 0,
        scheduled: 0,
        achieved: 0,
        overdue: 0,
        in_progress: 1,
      },
      next_cursor: null,
    });
    expect((await repository.list(null, null)).counts.in_progress).toBe(1);
    await expect(repository.list('achieved', null)).rejects.toMatchObject({
      code: 'service',
    });
  });
  it('checks receipt identity and revision without applying it as current state', async () => {
    const data = {
      operation_id: goalOperationId,
      goal_id: goalId,
      kind: 'amount_set',
      accepted_at: goalContext.readAt,
      goal_version: 1,
      event_sequence: 2,
      date: '2026-10-21',
      amount_milliunits: 0,
      revision: 2,
    };
    const { rpc, repository, response } = setup(data);
    await repository.recordAmount({
      operationId: goalOperationId,
      goalId,
      action: 'set',
      date: '2026-10-21',
      amountMilliunits: 0,
      expectedRevision: 1,
    });
    expect(rpc).toHaveBeenCalledWith('record_goal_amount', {
      p_input: {
        operation_id: goalOperationId,
        goal_id: goalId,
        action: 'set',
        date: '2026-10-21',
        amount_milliunits: 0,
        expected_revision: 1,
      },
    });
    response.mockResolvedValueOnce({
      data: { ...data, revision: 1 },
      error: null,
    });
    await expect(
      repository.recordAmount({
        operationId: goalOperationId,
        goalId,
        action: 'set',
        date: '2026-10-21',
        amountMilliunits: 0,
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: 'service' });
  });
});
