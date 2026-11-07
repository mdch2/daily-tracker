import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { addBusinessDays } from '@/features/habits/domain/habit-rules';
import { parseMilliunits } from '@/features/habits/application/habit-actions';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { IconButton } from '@/shared/ui/icon-button';
import { Sheet } from '@/shared/ui/sheet';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import {
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';
import { useConfirmedWrite } from '@/shared/presentation/use-confirmed-write';
import type {
  ArchiveGoal,
  GoalDefinition,
  GoalHistoryEvent,
  GoalMilestoneState,
  GoalReceipt,
  RecordGoalAmount,
  RecordGoalMilestone,
} from '../domain/goal';
import { canRecordGoal } from '../domain/goal-rules';
import { createGoalActions } from '../application/goal-actions';
import { useGoalPageReset, useGoalRepository } from './goal-context';
import { GoalCard } from './goal-card';
import { GoalForm } from './goal-form';
import { GoalWriteFeedback } from './goal-write-feedback';

type EditorProps = {
  goal: GoalDefinition;
  today: string;
  current: boolean;
  refresh: () => Promise<void>;
  onLock: (value: boolean) => void;
  onSaved: () => void;
};
function AmountEditor({
  goal,
  today,
  current,
  refresh,
  onLock,
  onSaved,
}: EditorProps) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const repository = useGoalRepository();
  const { state } = useAuth();
  const [date, setDate] = useState(today);
  const [value, setValue] = useState('');
  const [action, setAction] = useState<'add' | 'set'>('add');
  const [inputError, setInputError] = useState<OperationErrorCode | null>(null);
  const validDate = z.iso.date().safeParse(date).success;
  const day = useQuery({
    queryKey: ['goals', state.session?.userId, 'record-date', goal.id, date],
    queryFn: () => repository.readContributions(goal.id, date, date),
    enabled: validDate,
  });
  const write = useConfirmedWrite<RecordGoalAmount, GoalReceipt>(
    createGoalActions(repository).recordAmount,
    async () => {
      await refresh();
      await day.refetch({ throwOnError: true });
    },
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [write.locked, onLock]);
  const writable =
    validDate &&
    canRecordGoal(goal, date, today) &&
    day.isSuccess &&
    !day.isFetching &&
    current;
  async function save() {
    setInputError(null);
    try {
      const common = {
        operationId: randomUUID(),
        goalId: goal.id,
        date,
        amountMilliunits: parseMilliunits(value),
      };
      const input =
        write.pending ??
        (action === 'add'
          ? { ...common, action }
          : {
              ...common,
              action,
              expectedRevision: day.data?.days[0]?.revision ?? 0,
            });
      const result = await write.run(input);
      if (result) onSaved();
    } catch (failure) {
      setInputError(operationErrorCode(failure));
    }
  }
  return (
    <>
      <Text>{t('goals.manualAmountWindow')}</Text>
      <Input
        label={t('goals.recordDate')}
        hint={t('goals.dateHint')}
        value={date}
        onChangeText={setDate}
        editable={!write.blocked}
      />
      {day.isPending && validDate && <Text>{t('goals.loading')}</Text>}
      {day.isError && (
        <ErrorMessage
          message={t(`goals.errors.${operationErrorCode(day.error)}`)}
        />
      )}
      {day.isSuccess && (
        <Text>
          {day.data.days[0]?.recorded
            ? t('goals.recordedValue', {
                value: format.number(
                  (day.data.days[0].amountMilliunits ?? 0) / 1000,
                  { maximumFractionDigits: 3 },
                ),
                unit: goal.unitLabel,
              })
            : t('goals.notRecorded')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['add', 'set'] as const).map((option) => (
          <View key={option} style={{ flex: 1 }}>
            <Button
              title={t(option === 'add' ? 'goals.addAmount' : 'goals.setTotal')}
              selected={action === option}
              disabled={write.blocked}
              onPress={() => setAction(option)}
            />
          </View>
        ))}
      </View>
      <Input
        label={t('goals.amountLabel')}
        hint={t('goals.quantityHint')}
        value={value}
        keyboardType="decimal-pad"
        onChangeText={setValue}
        editable={!write.blocked}
      />
      {!writable && <Text>{t('goals.readOnly')}</Text>}
      {inputError && <ErrorMessage message={t(`goals.errors.${inputError}`)} />}
      <GoalWriteFeedback
        error={write.error}
        notice={write.notice}
        pending={!!write.pending}
        busy={write.busy}
        review={write.review}
        onRetry={() => {
          void save();
        }}
        onReload={() => {
          void write.reload().then((result) => {
            if (result) onSaved();
          });
        }}
      />
      <Button
        title={t('goals.save')}
        variant="primary"
        loading={write.busy}
        disabled={!writable || write.blocked}
        onPress={() => {
          void save();
        }}
      />
    </>
  );
}
function MilestoneEditor({
  goal,
  today,
  current,
  refresh,
  onLock,
  onSaved,
  milestone,
}: EditorProps & { milestone: GoalMilestoneState }) {
  const { t } = useTranslation();
  const repository = useGoalRepository();
  const [date, setDate] = useState(
    'completionDate' in milestone ? (milestone.completionDate ?? today) : today,
  );
  const write = useConfirmedWrite<RecordGoalMilestone, GoalReceipt>(
    createGoalActions(repository).recordMilestone,
    refresh,
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [write.locked, onLock]);
  const writable =
    current &&
    !goal.archivedAt &&
    today >= goal.startDate &&
    'revision' in milestone;
  async function save(completed: boolean) {
    const common = {
      operationId: randomUUID(),
      goalId: goal.id,
      milestoneId: milestone.id,
      expectedRevision: 'revision' in milestone ? milestone.revision : 0,
    };
    const input =
      write.pending ??
      (completed
        ? { ...common, completed: true as const, completionDate: date }
        : { ...common, completed: false as const, completionDate: null });
    const result = await write.run(input);
    if (result) onSaved();
  }
  return (
    <>
      <Text>{t('goals.milestoneWindow')}</Text>
      <Input
        label={t('goals.completionDate')}
        hint={t('goals.dateHint')}
        value={date}
        onChangeText={setDate}
        editable={!write.blocked}
      />
      {!writable && <Text>{t('goals.readOnly')}</Text>}
      <GoalWriteFeedback
        error={write.error}
        notice={write.notice}
        pending={!!write.pending}
        busy={write.busy}
        review={write.review}
        onRetry={() => {
          void save(write.pending?.completed ?? true);
        }}
        onReload={() => {
          void write.reload().then((result) => {
            if (result) onSaved();
          });
        }}
      />
      <Button
        title={t('goals.confirmMilestone')}
        variant="primary"
        disabled={!writable || write.blocked}
        loading={write.busy}
        onPress={() => {
          void save(true);
        }}
      />
      {milestone.completed && (
        <Button
          title={t('goals.revertMilestone')}
          disabled={!writable || write.blocked}
          onPress={() => {
            void save(false);
          }}
        />
      )}
    </>
  );
}
function ArchiveEditor({
  goal,
  refresh,
  current,
  onLock,
  onSaved,
}: EditorProps) {
  const { t } = useTranslation();
  const repository = useGoalRepository();
  const write = useConfirmedWrite<ArchiveGoal, GoalReceipt>(
    createGoalActions(repository).archive,
    refresh,
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [write.locked, onLock]);
  async function save() {
    const result = await write.run(
      write.pending ?? {
        operationId: randomUUID(),
        goalId: goal.id,
        expectedVersion: goal.version,
      },
    );
    if (result) onSaved();
  }
  return (
    <>
      <Text>{t('goals.archiveHint')}</Text>
      {goal.progressSource === 'habit' && (
        <Text>{t('goals.archiveLinkedHint')}</Text>
      )}
      <GoalWriteFeedback
        error={write.error}
        notice={write.notice}
        pending={!!write.pending}
        busy={write.busy}
        review={write.review}
        onRetry={() => {
          void save();
        }}
        onReload={() => {
          void write.reload().then((result) => {
            if (result) onSaved();
          });
        }}
      />
      <Button
        title={t('goals.archiveConfirm')}
        variant="primary"
        disabled={write.blocked || !!goal.archivedAt || !current}
        loading={write.busy}
        onPress={() => {
          void save();
        }}
      />
    </>
  );
}
function EventDetails({
  event,
  goal,
}: {
  event: GoalHistoryEvent;
  goal: GoalDefinition;
}) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const { colors } = useTheme();
  function display(value: unknown, numeric = false) {
    if (value === null || value === undefined) return t('goals.none');
    if (typeof value === 'number')
      return format.number(numeric ? value / 1000 : value, {
        maximumFractionDigits: 3,
      });
    if (typeof value === 'boolean')
      return t(value ? 'goals.done' : 'goals.pending');
    return typeof value === 'string' ? value : t('goals.none');
  }
  return (
    <View
      style={{
        gap: 4,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text weight="semibold">{t(`goals.events.${event.kind}`)}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        {format.date(new Date(event.acceptedAt), {
          timeZone: goal.timeZone,
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </Text>
      {event.date && (
        <Text>
          {t('goals.affectedDate', {
            date: format.businessDate(event.date, { dateStyle: 'medium' }),
          })}
        </Text>
      )}
      {event.kind.startsWith('amount_') && (
        <Text>
          {t('goals.change', {
            before: display(event.before?.amount_milliunits, true),
            after: display(event.after.amount_milliunits, true),
          })}
        </Text>
      )}
      {event.kind === 'milestone_set' && (
        <>
          <Text>
            {
              goal.milestones.find(
                (item) => item.id === event.after.milestone_id,
              )?.name
            }
          </Text>
          <Text>
            {t('goals.change', {
              before: display(event.before?.completed),
              after: display(event.after.completed),
            })}
          </Text>
          <Text>
            {t('goals.change', {
              before:
                typeof event.before?.completion_date === 'string'
                  ? format.businessDate(event.before.completion_date, {
                      dateStyle: 'medium',
                    })
                  : t('goals.none'),
              after:
                typeof event.after.completion_date === 'string'
                  ? format.businessDate(event.after.completion_date, {
                      dateStyle: 'medium',
                    })
                  : t('goals.none'),
            })}
          </Text>
        </>
      )}
      {event.kind === 'create' && <Text>{display(event.after.name)}</Text>}
      {event.kind === 'edit' &&
        (['name', 'description', 'deadline', 'target_milliunits'] as const)
          .filter((key) => event.before?.[key] !== event.after[key])
          .map((key) => (
            <View key={key}>
              <Text weight="semibold">{t(`goals.fields.${key}`)}</Text>
              <Text>
                {t('goals.change', {
                  before:
                    key === 'deadline' &&
                    typeof event.before?.[key] === 'string'
                      ? format.businessDate(event.before[key], {
                          dateStyle: 'medium',
                        })
                      : display(
                          event.before?.[key],
                          key === 'target_milliunits',
                        ),
                  after:
                    key === 'deadline' && typeof event.after[key] === 'string'
                      ? format.businessDate(event.after[key], {
                          dateStyle: 'medium',
                        })
                      : display(event.after[key], key === 'target_milliunits'),
                })}
              </Text>
            </View>
          ))}
    </View>
  );
}
function GoalHistorySection({
  goal,
  today,
}: {
  goal: GoalDefinition;
  today: string;
}) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const repository = useGoalRepository();
  const { state } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [historyPages, setHistoryPages] = useState<
    { before: number | null; upTo: number | null }[]
  >([{ before: null, upTo: null }]);
  const [datePage, setDatePage] = useState(0);
  const reset = useCallback(() => {
    setHistoryPages((value) =>
      value.length === 1 ? value : [{ before: null, upTo: null }],
    );
    setDatePage(0);
  }, []);
  useGoalPageReset(reset, today);
  const cursor = historyPages.at(-1)!;
  const history = useQuery({
    queryKey: ['goals', state.session?.userId, 'history', goal.id, cursor],
    queryFn: () => repository.readHistory(goal.id, cursor.before, cursor.upTo),
  });
  const anchor =
    goal.archivedOn && goal.archivedOn < today ? goal.archivedOn : today;
  const to = addBusinessDays(anchor, -datePage * 31);
  const from =
    goal.startDate > addBusinessDays(to, -30)
      ? goal.startDate
      : addBusinessDays(to, -30);
  const showContributions =
    goal.mode === 'amount' || goal.progressSource === 'habit';
  const dates = useQuery({
    queryKey: [
      'goals',
      state.session?.userId,
      'contributions',
      goal.id,
      from,
      to,
    ],
    queryFn: () => repository.readContributions(goal.id, from, to),
    enabled: showContributions && from <= to,
  });
  const unit =
    goal.linkedMetric === 'completed_days'
      ? t('goals.completedDays')
      : (goal.unitLabel ?? '');
  return (
    <>
      {showContributions && (
        <Card>
          <Text weight="bold" accessibilityRole="header">
            {t('goals.contributions')}
          </Text>
          {goal.progressSource === 'habit' && (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {t('goals.historyLinkedHint')}
            </Text>
          )}
          {from > to && <Text>{t('goals.readOnly')}</Text>}
          {dates.isPending && from <= to && <Text>{t('goals.loading')}</Text>}
          {dates.isError && (
            <>
              <ErrorMessage
                message={t(`goals.errors.${operationErrorCode(dates.error)}`)}
              />
              <Button
                title={t('common.retry')}
                onPress={() => {
                  void dates.refetch();
                }}
              />
            </>
          )}
          {dates.isSuccess &&
            [...dates.data.days]
              .reverse()
              .filter((item) => item.inWindow)
              .map((item) => (
                <View
                  key={item.date}
                  style={{
                    gap: 4,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text weight="semibold">
                    {format.businessDate(item.date, { dateStyle: 'medium' })}
                  </Text>
                  <Text>
                    {item.recorded
                      ? t('goals.contribution', {
                          value: format.number(
                            (item.contributionMilliunits ?? 0) / 1000,
                            { maximumFractionDigits: 3 },
                          ),
                          unit,
                        })
                      : t('goals.notRecorded')}
                  </Text>
                </View>
              ))}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {from > goal.startDate && (
              <Button
                title={t('goals.earlierDates')}
                onPress={() => setDatePage((value) => value + 1)}
              />
            )}
            {datePage > 0 && (
              <Button
                title={t('goals.laterDates')}
                onPress={() => setDatePage((value) => value - 1)}
              />
            )}
          </View>
          {goal.habitId && (
            <Button
              title={t('goals.openHabit')}
              onPress={() =>
                router.push({
                  pathname: '/habits/[id]',
                  params: { id: goal.habitId! },
                })
              }
            />
          )}
        </Card>
      )}
      <Card>
        <Text weight="bold" accessibilityRole="header">
          {t('goals.history')}
        </Text>
        {history.isPending && <Text>{t('goals.loading')}</Text>}
        {history.isError && (
          <>
            <ErrorMessage
              message={t(`goals.errors.${operationErrorCode(history.error)}`)}
            />
            <Button
              title={t('common.retry')}
              onPress={() => {
                void history.refetch();
              }}
            />
          </>
        )}
        {history.isSuccess && (
          <>
            {!history.data.events.length && (
              <Text>{t('goals.emptyHistory')}</Text>
            )}
            {history.data.events.map((event) => (
              <EventDetails key={event.sequence} event={event} goal={goal} />
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {historyPages.length > 1 && (
                <Button
                  title={t('goals.newer')}
                  onPress={() => setHistoryPages((value) => value.slice(0, -1))}
                />
              )}
              {history.data.nextBeforeSequence !== null && (
                <Button
                  title={t('goals.older')}
                  onPress={() =>
                    setHistoryPages((value) => [
                      ...value,
                      {
                        before: history.data.nextBeforeSequence,
                        upTo: history.data.upToSequence,
                      },
                    ])
                  }
                />
              )}
            </View>
          </>
        )}
      </Card>
    </>
  );
}
function GoalDetail({
  id,
  context,
}: {
  id: string;
  context: ReadyBusinessContext;
}) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const router = useRouter();
  const { state } = useAuth();
  const client = useQueryClient();
  const repository = useGoalRepository();
  const [panel, setPanel] = useState<
    'amount' | 'edit' | 'archive' | { milestone: string } | null
  >(null);
  const [locked, setLocked] = useState(false);
  usePreventRemove(locked);
  const detail = useQuery({
    queryKey: ['goals', state.session?.userId, 'detail', id],
    queryFn: () => repository.findById(id),
  });
  const { refetch } = detail;
  const refresh = useCallback(async () => {
    await client.invalidateQueries(
      { queryKey: ['goals', state.session?.userId] },
      { throwOnError: true },
    );
    await refetch({ throwOnError: true });
  }, [client, state.session?.userId, refetch]);
  const goal = detail.data?.goal;
  const definition = goal?.definition;
  const current = detail.isSuccess && !detail.isFetching;
  const close = () => {
    if (!locked) setPanel(null);
  };
  const saved = () => {
    setLocked(false);
    setPanel(null);
  };
  const manual = definition?.progressSource === 'manual';
  const chosen =
    panel && typeof panel === 'object'
      ? goal?.milestoneStates.find((item) => item.id === panel.milestone)
      : undefined;
  const panelTitle =
    panel === 'edit'
      ? t('goals.edit')
      : panel === 'archive'
        ? t('goals.archive')
        : panel === 'amount'
          ? t('goals.record')
          : (definition?.milestones.find((item) => item.id === chosen?.id)
              ?.name ?? t('goals.milestones'));
  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton
            label={t('goals.back')}
            icon="arrow-left"
            disabled={locked}
            onPress={() => router.replace('/(tabs)/goals')}
          />
          <Text
            weight="bold"
            accessibilityRole="header"
            style={{ fontSize: 22, flex: 1 }}
          >
            {t('goals.title')}
          </Text>
        </View>
      }
    >
      {detail.isPending && <Text>{t('goals.loading')}</Text>}
      {detail.isError && (
        <>
          <ErrorMessage
            message={t(`goals.errors.${operationErrorCode(detail.error)}`)}
          />
          <Button
            title={t('common.retry')}
            disabled={locked}
            onPress={() => {
              void detail.refetch();
            }}
          />
        </>
      )}
      {detail.isSuccess && !goal && <Text>{t('goals.notFound')}</Text>}
      {goal && definition && (
        <>
          <GoalCard goal={goal} />
          {definition.description && (
            <Card>
              <Text>{definition.description}</Text>
            </Card>
          )}
          {definition.archivedAt && (
            <Card>
              <Text>{t('goals.archivedHint')}</Text>
              {!manual && <Text>{t('goals.archiveLinkedHint')}</Text>}
            </Card>
          )}
          {manual && definition.mode === 'amount' && !definition.archivedAt && (
            <Button
              title={t('goals.record')}
              variant="primary"
              disabled={
                !current || context.today < definition.startDate || locked
              }
              onPress={() => setPanel('amount')}
            />
          )}
          {definition.milestones.length > 0 && (
            <Card>
              <Text weight="bold" accessibilityRole="header">
                {t('goals.milestones')}
              </Text>
              {definition.milestones.map((milestone, index) => {
                const status = goal.milestoneStates[index];
                return (
                  <View
                    key={milestone.id}
                    style={{ gap: 8, paddingVertical: 8 }}
                  >
                    <Text weight="semibold">{milestone.name}</Text>
                    <Text>
                      {t(status?.completed ? 'goals.done' : 'goals.pending')}
                    </Text>
                    {status &&
                      'completionDate' in status &&
                      status.completionDate && (
                        <Text>
                          {format.businessDate(status.completionDate, {
                            dateStyle: 'medium',
                          })}
                        </Text>
                      )}
                    {milestone.thresholdMilliunits !== null && (
                      <Text>
                        {t('goals.contribution', {
                          value: format.number(
                            milestone.thresholdMilliunits / 1000,
                            { maximumFractionDigits: 3 },
                          ),
                          unit:
                            definition.linkedMetric === 'completed_days'
                              ? t('goals.completedDays')
                              : definition.unitLabel,
                        })}
                      </Text>
                    )}
                    {manual && !definition.archivedAt && (
                      <Button
                        title={t('goals.record')}
                        disabled={
                          !current ||
                          context.today < definition.startDate ||
                          locked
                        }
                        onPress={() => setPanel({ milestone: milestone.id })}
                      />
                    )}
                  </View>
                );
              })}
            </Card>
          )}
          {definition.habitId && (
            <Button
              title={t('goals.openHabit')}
              disabled={locked}
              onPress={() =>
                router.push({
                  pathname: '/habits/[id]',
                  params: { id: definition.habitId! },
                })
              }
            />
          )}
          {!definition.archivedAt && (
            <>
              <Button
                title={t('goals.edit')}
                disabled={!current || locked}
                onPress={() => setPanel('edit')}
              />
              <Button
                title={t('goals.archive')}
                disabled={!current || locked}
                onPress={() => setPanel('archive')}
              />
            </>
          )}
          <GoalHistorySection goal={definition} today={context.today} />
          <Button
            title={t('goals.refresh')}
            disabled={locked}
            loading={detail.isFetching}
            onPress={() => {
              void refresh().catch(() => undefined);
            }}
          />
          {panel && (
            <Sheet title={panelTitle} locked={locked} onClose={close}>
              {panel === 'edit' ? (
                <GoalForm
                  goal={definition}
                  context={context}
                  onLock={setLocked}
                  onSaved={saved}
                />
              ) : panel === 'amount' ? (
                <AmountEditor
                  goal={definition}
                  today={context.today}
                  current={current}
                  refresh={refresh}
                  onLock={setLocked}
                  onSaved={saved}
                />
              ) : panel === 'archive' ? (
                <ArchiveEditor
                  goal={definition}
                  today={context.today}
                  current={current}
                  refresh={refresh}
                  onLock={setLocked}
                  onSaved={saved}
                />
              ) : chosen ? (
                <MilestoneEditor
                  goal={definition}
                  milestone={chosen}
                  today={context.today}
                  current={current}
                  refresh={refresh}
                  onLock={setLocked}
                  onSaved={saved}
                />
              ) : (
                <Text>{t('goals.notFound')}</Text>
              )}
            </Sheet>
          )}
        </>
      )}
    </Screen>
  );
}
export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <BusinessCalendarGate>
      {(context) => <GoalDetail id={id ?? ''} context={context} />}
    </BusinessCalendarGate>
  );
}
