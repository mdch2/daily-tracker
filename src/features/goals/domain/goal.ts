export const GOAL_MAX_MILLIUNITS = 999_999_999_999;
export const goalStates = [
  'archived',
  'scheduled',
  'achieved',
  'overdue',
  'in_progress',
] as const;
export type GoalState = (typeof goalStates)[number];
export type GoalMetric = 'amount' | 'completed_days';
export type GoalMilestone = {
  id: string;
  name: string;
  position: number;
  thresholdMilliunits: number | null;
};
export type GoalDefinition = {
  id: string;
  name: string;
  description: string | null;
  reward: string | null;
  mode: 'amount' | 'milestones';
  progressSource: 'manual' | 'habit';
  startDate: string;
  deadline: string | null;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  archivedOn: string | null;
  version: number;
  unitLabel: string | null;
  targetMilliunits: number | null;
  habitId: string | null;
  linkedMetric: GoalMetric | null;
  milestones: GoalMilestone[];
};
export type GoalProgress =
  | {
      available: true;
      accumulatedMilliunits: number | null;
      completedMilestones: number | null;
      totalMilestones: number | null;
      percentage: number;
    }
  | { available: false; error: 'amountLimit' };
export type GoalMilestoneState = { id: string; completed: boolean } & (
  | { revision: number; completionDate: string | null }
  | { thresholdMilliunits: number }
);
export type GoalRead = {
  definition: GoalDefinition;
  state: GoalState;
  progress: GoalProgress;
  milestoneStates: GoalMilestoneState[];
  source: {
    habitId: string;
    name: string;
    measurementMode: 'binary' | 'quantity';
    linkedMetric: GoalMetric;
    unitLabel: string | null;
  } | null;
};
export type GoalContext = {
  readAt: string;
  today: string;
  timeZone: string;
  nextDayAt: string;
};
export type GoalPage = {
  context: GoalContext;
  goals: GoalRead[];
  counts: Record<GoalState, number>;
  nextCursor: string | null;
};
export type GoalDetail = { context: GoalContext; goal: GoalRead | null };
export type GoalContribution = {
  date: string;
  inWindow: boolean;
  recorded: boolean;
  revision: number | null;
  amountMilliunits: number | null;
  binaryValue: boolean | null;
  sourceDefinitionId: string | null;
  completed: boolean;
  contributionMilliunits: number | null;
};
export type GoalEventKind =
  'create' | 'edit' | 'archive' | 'amount_add' | 'amount_set' | 'milestone_set';
export type GoalHistoryEvent = {
  sequence: number;
  operationId: string;
  kind: GoalEventKind;
  acceptedAt: string;
  date: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
};
export type GoalHistory = {
  context: GoalContext;
  events: GoalHistoryEvent[];
  upToSequence: number;
  nextBeforeSequence: number | null;
};
type CreateBase = {
  operationId: string;
  goalId: string;
  name: string;
  description: string | null;
  reward: string | null;
  startDate: string;
  deadline: string | null;
};
type ManualOrigin = { progressSource: 'manual' };
type HabitOrigin = {
  progressSource: 'habit';
  habitId: string;
  linkedMetric: GoalMetric;
};
type MilestoneInput = { id: string; name: string };
export type CreateGoal = CreateBase &
  (
    | (ManualOrigin & {
        mode: 'amount';
        unitLabel: string;
        targetMilliunits: number;
      })
    | (ManualOrigin & { mode: 'milestones'; milestones: MilestoneInput[] })
    | (HabitOrigin & { mode: 'amount'; targetMilliunits: number })
    | (HabitOrigin & {
        mode: 'milestones';
        milestones: (MilestoneInput & { thresholdMilliunits: number })[];
      })
  );
export type EditGoal = {
  operationId: string;
  goalId: string;
  expectedVersion: number;
  name: string;
  description: string | null;
  reward: string | null;
  deadline: string | null;
  targetMilliunits: number | null;
};
export type ArchiveGoal = Pick<
  EditGoal,
  'operationId' | 'goalId' | 'expectedVersion'
>;
export type RecordGoalAmount = {
  operationId: string;
  goalId: string;
  date: string;
  amountMilliunits: number;
} & ({ action: 'add' } | { action: 'set'; expectedRevision: number });
export type RecordGoalMilestone = {
  operationId: string;
  goalId: string;
  milestoneId: string;
  expectedRevision: number;
} & (
  | { completed: true; completionDate: string }
  | { completed: false; completionDate: null }
);
export type GoalReceipt = {
  operationId: string;
  goalId: string;
  kind: GoalEventKind;
  acceptedAt: string;
  goalVersion: number;
  eventSequence: number;
  date?: string;
  amountMilliunits?: number;
  revision?: number;
  milestoneId?: string;
  completed?: boolean;
  completionDate?: string | null;
  archivedAt?: string;
  archivedOn?: string;
};
export interface GoalRepository {
  list(status: GoalState | null, cursor: string | null): Promise<GoalPage>;
  findById(id: string): Promise<GoalDetail>;
  readContributions(
    id: string,
    from: string,
    to: string,
  ): Promise<{ context: GoalContext; days: GoalContribution[] }>;
  readHistory(
    id: string,
    beforeSequence: number | null,
    upToSequence: number | null,
  ): Promise<GoalHistory>;
  create(input: CreateGoal): Promise<GoalReceipt>;
  edit(input: EditGoal): Promise<GoalReceipt>;
  archive(input: ArchiveGoal): Promise<GoalReceipt>;
  recordAmount(input: RecordGoalAmount): Promise<GoalReceipt>;
  recordMilestone(input: RecordGoalMilestone): Promise<GoalReceipt>;
}
