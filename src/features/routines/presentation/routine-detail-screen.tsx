import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useRouter, usePreventRemove } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import { HabitDayEditor } from '@/features/habits/presentation/habit-day-editor';
import { HabitSummary } from '@/features/habits/presentation/habit-summary';
import { addBusinessDays } from '@/features/habits/domain/habit-rules';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Sheet } from '@/shared/ui/sheet';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import type {
  RecordOwnStep,
  Routine,
  RoutineDayRecord,
} from '../domain/routine';
import { evaluateRoutine } from '../domain/routine-rules';
import { createRoutineActions } from '../application/routine-actions';
import { readRoutineWindow } from '../application/read-routine-window';
import { useRoutineRepository } from './routine-context';
import { useRoutineWrite } from './use-routine-write';
import { RoutineWriteFeedback } from './routine-write-feedback';
import { RoutineProgress } from './routine-card';
import { RoutineForm } from './routine-form';

function OwnStepEditor({
  routine,
  stepId,
  date,
  today,
  record,
  refresh,
  onLock,
  dataCurrent,
}: {
  routine: Routine;
  stepId: string;
  date: string;
  today: string;
  record: RoutineDayRecord | undefined;
  refresh: () => Promise<void>;
  onLock: (locked: boolean) => void;
  dataCurrent: boolean;
}) {
  const { t } = useTranslation();
  const repository = useRoutineRepository();
  const write = useRoutineWrite(
    createRoutineActions(repository).record,
    refresh,
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [write.locked, onLock]);
  const writable = date === today && !routine.archivedAt && dataCurrent;
  const save = () => {
    void write.run(
      write.pending ??
        ({
          operationId: randomUUID(),
          routineId: routine.id,
          stepId,
          date,
          completed: !record?.completed,
          expectedRevision: record?.revision ?? 0,
        } satisfies RecordOwnStep),
    );
  };
  return (
    <>
      <Text>
        {record
          ? t(record.completed ? 'routines.stepDone' : 'habits.explicitFalse')
          : t('habits.noRecord')}
      </Text>
      {!writable && <Text>{t('routines.readOnly')}</Text>}
      <RoutineWriteFeedback
        error={write.error}
        notice={write.notice}
        pending={!!write.pending}
        busy={write.busy}
        review={write.review}
        onRetry={save}
        onReload={() => {
          void write.reload();
        }}
      />
      <Button
        title={t(record?.completed ? 'habits.undo' : 'habits.complete')}
        disabled={!writable || write.blocked}
        loading={write.busy}
        onPress={save}
      />
    </>
  );
}
function RoutineDetail({
  id,
  initialDate,
  context,
}: {
  id: string;
  initialDate?: string | undefined;
  context: ReadyBusinessContext;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const format = useLocalizedFormatters();
  const { state } = useAuth();
  const repository = useRoutineRepository();
  const habits = useHabitRepository();
  const client = useQueryClient();
  const user = state.session?.userId;
  const [date, setDate] = useState(
    initialDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(initialDate) &&
      Number.isFinite(Date.parse(initialDate)) &&
      new Date(initialDate + 'T00:00:00Z').toISOString().slice(0, 10) ===
        initialDate
      ? initialDate
      : context.today,
  );
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [stepId, setStepId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const detail = useQuery({
    queryKey: ['routines', user, 'detail', id],
    queryFn: () => repository.findById(id),
  });
  const routine = detail.data;
  const from =
    routine && routine.startDate > addBusinessDays(date, -13)
      ? routine.startDate
      : addBusinessDays(date, -13);
  const window = useQuery({
    queryKey: ['routines', user, 'window', routine, from, date, context.today],
    queryFn: () =>
      readRoutineWindow(
        repository,
        habits,
        routine ? [routine] : [],
        from,
        date,
      ),
    enabled: !!routine && from <= date,
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['routines', user],
      refetchType: 'none',
    });
    await client.invalidateQueries({
      queryKey: ['habits', user],
      refetchType: 'none',
    });
    const result = await window.refetch({ throwOnError: true });
    await client.refetchQueries(
      { queryKey: ['routines', user], type: 'active' },
      { throwOnError: true },
    );
    await client.refetchQueries(
      { queryKey: ['habits', user, 'overview'], type: 'active' },
      { throwOnError: true },
    );
    return result.data!;
  }
  const archive = useRoutineWrite(
    async (
      input: Parameters<ReturnType<typeof createRoutineActions>['archive']>[0],
    ) => {
      await createRoutineActions(repository).archive(input);
      return true;
    },
    async () => {
      await client.invalidateQueries(
        { queryKey: ['routines', user] },
        { throwOnError: true },
      );
    },
  );
  usePreventRemove(locked || archive.locked);
  const result =
    routine && window.data
      ? evaluateRoutine(routine, date, context.today, window.data)
      : null;
  const selected = result?.steps.find((value) => value.step.id === stepId);
  const failure = detail.error ?? window.error;
  const dataCurrent = detail.isSuccess && window.isSuccess && !failure;
  const pending = routine?.definitions.find(
    (definition) => definition.effectiveFrom > context.today,
  );
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconButton
        label={t('routines.back')}
        icon="arrow-left"
        disabled={locked}
        onPress={() => router.replace('/(tabs)/routines')}
      />
      <Text
        accessibilityRole="header"
        weight="bold"
        style={{ fontSize: 20, flex: 1 }}
      >
        {t('routines.detail')}
      </Text>
      {routine && !routine.archivedAt && (
        <IconButton
          label={t('routines.edit')}
          icon="edit-2"
          disabled={!dataCurrent || locked}
          onPress={() => setEditing(true)}
        />
      )}
    </View>
  );
  return (
    <>
      <Screen header={header}>
        {detail.isPending && <Text>{t('routines.loading')}</Text>}
        {failure && (
          <>
            <ErrorMessage
              message={t(`routines.errors.${operationErrorCode(failure)}`)}
            />
            <Button
              title={t('common.retry')}
              onPress={() => {
                void detail.refetch();
                void window.refetch();
              }}
            />
          </>
        )}
        {detail.isSuccess && !routine && (
          <Text>{t('routines.errors.notFound')}</Text>
        )}
        {routine && (
          <>
            <Card>
              <View
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                <Icon name="layers" color={colors.link} size={32} />
                <Text weight="bold" style={{ fontSize: 24, flex: 1 }}>
                  {routine.name}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {t(
                  routine.archivedAt
                    ? 'routines.archived'
                    : 'routines.orderHint',
                )}
              </Text>
              {pending && (
                <Text style={{ color: colors.link, fontSize: 13 }}>
                  {t('habits.edit.pendingFrom', {
                    date: format.businessDate(pending.effectiveFrom, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  })}
                </Text>
              )}
            </Card>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <IconButton
                label={t('habits.previousDay')}
                icon="chevron-left"
                disabled={date <= routine.startDate}
                onPress={() => setDate((value) => addBusinessDays(value, -1))}
              />
              <Text style={{ flex: 1, textAlign: 'center' }}>
                {format.businessDate(date, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              <IconButton
                label={t('habits.nextDay')}
                icon="chevron-right"
                disabled={date >= context.today}
                onPress={() => setDate((value) => addBusinessDays(value, 1))}
              />
            </View>
            {date !== context.today && (
              <Button
                title={t('routines.goToday')}
                variant="secondary"
                onPress={() => setDate(context.today)}
              />
            )}
            {(date !== context.today || routine.archivedAt) && (
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {t('routines.readOnly')}
              </Text>
            )}
            {date < routine.startDate && (
              <Text>{t('routines.status.notStarted')}</Text>
            )}
            {window.isPending && from <= date && (
              <Text>{t('routines.loading')}</Text>
            )}
            {result && dataCurrent && (
              <>
                <Card>
                  <Text weight="bold">
                    {t(`routines.status.${result.status}`)}
                  </Text>
                  <RoutineProgress result={result} />
                </Card>
                <Text
                  weight="bold"
                  accessibilityRole="header"
                  style={{ fontSize: 20 }}
                >
                  {t('routines.steps')}
                </Text>
                {result.steps.map(
                  (
                    {
                      step,
                      habit,
                      eligible,
                      required,
                      completed,
                      incompatible,
                    },
                    index,
                  ) => (
                    <Card key={step.id}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <Icon
                          name={
                            eligible && completed ? 'check-circle' : 'circle'
                          }
                          color={
                            eligible && completed ? colors.link : colors.muted
                          }
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text weight="semibold">
                            {step.kind === 'own' ? step.title : habit!.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.muted }}>
                            {t('routines.stepSummary', {
                              number: format.number(index + 1),
                              kind: t(
                                step.kind === 'own'
                                  ? 'routines.own'
                                  : 'routines.linked',
                              ),
                              requirement: t(
                                required
                                  ? 'routines.required'
                                  : 'routines.optional',
                              ),
                            })}
                          </Text>
                          {!eligible && (
                            <Text style={{ color: colors.muted, fontSize: 13 }}>
                              {t('routines.status.notScheduled')}
                            </Text>
                          )}
                          {incompatible && (
                            <Text style={{ color: colors.muted, fontSize: 13 }}>
                              {t('routines.flexibleChanged')}
                            </Text>
                          )}
                        </View>
                      </View>
                      {eligible && (
                        <Button
                          title={t(
                            date === context.today && !routine.archivedAt
                              ? 'routines.recordStep'
                              : 'routines.inspectStep',
                            {
                              name:
                                step.kind === 'own' ? step.title : habit!.name,
                            },
                          )}
                          variant="secondary"
                          onPress={() => setStepId(step.id)}
                        />
                      )}
                    </Card>
                  ),
                )}
                <Text
                  accessibilityRole="header"
                  weight="bold"
                  style={{ fontSize: 20 }}
                >
                  {t('habits.history')}
                </Text>
                <View style={{ gap: 8 }}>
                  {Array.from(
                    {
                      length: Math.min(
                        14,
                        (Date.parse(date) - Date.parse(from)) / 86400000 + 1,
                      ),
                    },
                    (_, index) => addBusinessDays(date, -index),
                  ).map((value) => {
                    const historical = evaluateRoutine(
                      routine,
                      value,
                      context.today,
                      window.data!,
                    );
                    return (
                      <Button
                        key={value}
                        title={t('habits.dateStatus', {
                          date: format.businessDate(value, {
                            day: 'numeric',
                            month: 'short',
                          }),
                          status: t(`routines.status.${historical.status}`),
                        })}
                        variant="secondary"
                        onPress={() => setDate(value)}
                      />
                    );
                  })}
                </View>
                {from > routine.startDate && (
                  <Button
                    title={t('habits.older')}
                    variant="secondary"
                    onPress={() => setDate(addBusinessDays(from, -1))}
                  />
                )}
              </>
            )}
            {!routine.archivedAt && (
              <Button
                title={t('routines.archive')}
                variant="secondary"
                disabled={!dataCurrent}
                onPress={() => setArchiving(true)}
              />
            )}
          </>
        )}
      </Screen>
      {editing && routine && (
        <Sheet
          title={t('routines.edit')}
          locked={locked}
          onClose={() => setEditing(false)}
        >
          <RoutineForm
            routine={routine}
            context={context}
            onLock={setLocked}
            onSaved={() => setEditing(false)}
          />
        </Sheet>
      )}
      {selected && routine && window.data && (
        <Sheet
          title={
            selected.step.kind === 'own'
              ? selected.step.title
              : selected.habit!.name
          }
          locked={locked}
          onClose={() => setStepId(null)}
        >
          {selected.step.kind === 'own' ? (
            <OwnStepEditor
              routine={routine}
              stepId={selected.step.id}
              date={date}
              today={context.today}
              record={selected.ownRecord}
              onLock={setLocked}
              dataCurrent={dataCurrent}
              refresh={async () => {
                await refresh();
              }}
            />
          ) : (
            <>
              {(date !== context.today || routine.archivedAt) && (
                <Text>{t('routines.readOnly')}</Text>
              )}
              <HabitSummary
                habit={selected.habit!}
                date={date}
                today={context.today}
                records={window.data.habitRecords}
              />
              <HabitDayEditor
                habit={selected.habit!}
                date={date}
                today={context.today}
                record={window.data.habitRecords.find(
                  (record) =>
                    record.habitId === selected.habit!.id &&
                    record.date === date,
                )}
                refresh={async () => (await refresh()).habitRecords}
                onLock={setLocked}
                dataCurrent={
                  dataCurrent && date === context.today && !routine.archivedAt
                }
              />
            </>
          )}
        </Sheet>
      )}
      {archiving && routine && (
        <Sheet
          title={t('routines.archive')}
          locked={archive.locked}
          onClose={() => setArchiving(false)}
        >
          <Text>{t('routines.archiveHint')}</Text>
          <RoutineWriteFeedback
            error={archive.error}
            notice={archive.notice}
            pending={!!archive.pending}
            busy={archive.busy}
            review={archive.review}
            onRetry={() => {
              if (archive.pending)
                void archive.run(archive.pending).then((saved) => {
                  if (saved) setArchiving(false);
                });
            }}
            onReload={() => {
              void archive.reload().then((saved) => {
                if (saved) setArchiving(false);
              });
            }}
          />
          <Button
            title={t('routines.confirmArchive')}
            loading={archive.busy}
            disabled={archive.blocked}
            onPress={() => {
              void archive
                .run({
                  operationId: randomUUID(),
                  routineId: routine.id,
                  expectedUpdatedAt: routine.updatedAt,
                })
                .then((saved) => {
                  if (saved) setArchiving(false);
                });
            }}
          />
        </Sheet>
      )}
    </>
  );
}
export function RoutineDetailScreen() {
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  return (
    <BusinessCalendarGate>
      {(context) => (
        <RoutineDetail
          id={params.id}
          initialDate={params.date}
          context={context}
        />
      )}
    </BusinessCalendarGate>
  );
}
