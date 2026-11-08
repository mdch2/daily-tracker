import type {
  GoalContext,
  GoalDefinition,
  GoalPage,
  GoalRead,
  GoalReceipt,
  GoalRepository,
} from '@/features/goals/domain/goal';
export const goalId = '30000000-0000-4000-8000-000000000011';
export const goalOperationId = '30000000-0000-4000-8000-000000000012';
export const goalMilestoneId = '30000000-0000-4000-8000-000000000013';
export const goalContext: GoalContext = {
  readAt: '2026-10-21T17:00:00Z',
  today: '2026-10-21',
  timeZone: 'America/Bogota',
  nextDayAt: '2026-10-22T05:00:00Z',
};
export const goalDefinition: GoalDefinition = {
  id: goalId,
  name: 'Synthetic savings',
  description: null,
  reward: null,
  mode: 'amount',
  progressSource: 'manual',
  startDate: '2026-10-01',
  deadline: null,
  timeZone: 'America/Bogota',
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
  archivedAt: null,
  archivedOn: null,
  version: 1,
  unitLabel: 'units',
  targetMilliunits: 100000,
  habitId: null,
  linkedMetric: null,
  milestones: [],
};
export const goalRead: GoalRead = {
  definition: goalDefinition,
  state: 'in_progress',
  progress: {
    available: true,
    accumulatedMilliunits: 40000,
    completedMilestones: null,
    totalMilestones: null,
    percentage: 40,
  },
  milestoneStates: [],
  source: null,
};
export const goalPage: GoalPage = {
  context: goalContext,
  goals: [goalRead],
  counts: {
    archived: 0,
    scheduled: 0,
    achieved: 0,
    overdue: 0,
    in_progress: 1,
  },
  nextCursor: null,
};
export function goalReceipt(overrides: Partial<GoalReceipt> = {}): GoalReceipt {
  return {
    operationId: goalOperationId,
    goalId,
    kind: 'create',
    acceptedAt: goalContext.readAt,
    goalVersion: 1,
    eventSequence: 1,
    ...overrides,
  };
}
export function goalRepositoryStub(): jest.Mocked<GoalRepository> {
  return {
    list: jest.fn().mockResolvedValue(goalPage),
    findById: jest
      .fn()
      .mockResolvedValue({ context: goalContext, goal: goalRead }),
    readContributions: jest
      .fn()
      .mockResolvedValue({ context: goalContext, days: [] }),
    readHistory: jest.fn().mockResolvedValue({
      context: goalContext,
      events: [],
      upToSequence: 1,
      nextBeforeSequence: null,
    }),
    create: jest
      .fn()
      .mockImplementation(async (input) =>
        goalReceipt({ goalId: input.goalId, operationId: input.operationId }),
      ),
    edit: jest.fn().mockImplementation(async (input) =>
      goalReceipt({
        kind: 'edit',
        goalVersion: input.expectedVersion + 1,
        goalId: input.goalId,
        operationId: input.operationId,
      }),
    ),
    archive: jest.fn().mockImplementation(async (input) =>
      goalReceipt({
        kind: 'archive',
        goalVersion: input.expectedVersion + 1,
        goalId: input.goalId,
        operationId: input.operationId,
      }),
    ),
    recordAmount: jest.fn().mockImplementation(async (input) =>
      goalReceipt({
        kind: input.action === 'add' ? 'amount_add' : 'amount_set',
        goalId: input.goalId,
        operationId: input.operationId,
        date: input.date,
        amountMilliunits: input.amountMilliunits,
        revision: 1,
      }),
    ),
    recordMilestone: jest.fn().mockImplementation(async (input) =>
      goalReceipt({
        kind: 'milestone_set',
        goalId: input.goalId,
        operationId: input.operationId,
        milestoneId: input.milestoneId,
        completed: input.completed,
        completionDate: input.completionDate,
        revision: input.expectedRevision + 1,
      }),
    ),
  };
}
