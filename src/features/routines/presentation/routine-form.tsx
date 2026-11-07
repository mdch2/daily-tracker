import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import { HabitScheduleFields } from '@/features/habits/presentation/habit-schedule-fields';
import {
  habitAtDate,
  addBusinessDays,
} from '@/features/habits/domain/habit-rules';
import type { Habit } from '@/features/habits/domain/habit';
import { Button, Input, Text, ErrorMessage } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { IconButton } from '@/shared/ui/icon-button';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import {
  OperationError,
  operationErrorCode,
} from '@/shared/domain/operation-error';
import type {
  CreateRoutine,
  EditRoutine,
  Routine,
  RoutineConfiguration,
  RoutineSchedule,
  RoutineStep,
} from '../domain/routine';
import { routineDefinitionFor } from '../domain/routine-rules';
import { createRoutineActions } from '../application/routine-actions';
import { useRoutineRepository } from './routine-context';
import { useRoutineWrite } from './use-routine-write';
import { RoutineWriteFeedback } from './routine-write-feedback';

function configOf(routine: Routine, date: string): RoutineConfiguration {
  const pending = routine.definitions.find(
    (definition) => definition.effectiveFrom > date,
  );
  const definition = pending ?? routineDefinitionFor(routine, date);
  return {
    ...(definition.scheduleType === 'daily'
      ? { scheduleType: 'daily' as const }
      : {
          scheduleType: 'weekdays' as const,
          weekdayMask: definition.weekdayMask,
        }),
    steps: definition.steps,
  };
}
export function RoutineForm({
  routine,
  context,
  onSaved,
  onLock,
}: {
  routine?: Routine;
  context: ReadyBusinessContext;
  onSaved: (id: string) => void;
  onLock: (locked: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  const { state } = useAuth();
  const repository = useRoutineRepository();
  const habitRepository = useHabitRepository();
  const client = useQueryClient();
  const [id] = useState(() => routine?.id ?? randomUUID());
  const [name, setName] = useState(routine?.name ?? '');
  const [base, setBase] = useState(routine);
  const [initial] = useState(() =>
    routine
      ? configOf(routine, context.today)
      : {
          scheduleType: 'daily' as const,
          steps: [
            {
              id: randomUUID(),
              kind: 'own' as const,
              title: '',
              required: true,
            },
          ],
        },
  );
  const [schedule, setSchedule] = useState<RoutineSchedule['scheduleType']>(
    initial.scheduleType,
  );
  const [mask, setMask] = useState(
    initial.scheduleType === 'weekdays' ? initial.weekdayMask : 0,
  );
  const [steps, setSteps] = useState<RoutineStep[]>(initial.steps);
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState('');
  const user = state.session?.userId;
  const choices = useQuery({
    queryKey: ['habits', user, 'routine-choices'],
    queryFn: async () => {
      const all: Habit[] = [];
      for (let offset = 0; ; offset += 30) {
        const page = await habitRepository.list(offset);
        all.push(...page.habits);
        if (!page.hasMore) break;
        if (!page.habits.length) throw new OperationError('service');
      }
      return all;
    },
  });
  const effective = addBusinessDays(context.weekStartDate, 7);
  const actions = createRoutineActions(repository);
  const write = useRoutineWrite<CreateRoutine | EditRoutine, string>(
    async (input) => {
      if ('operationId' in input) {
        await actions.edit(input);
        return input.routineId;
      }
      return actions.create(input);
    },
    async () => {
      await client.invalidateQueries(
        { queryKey: ['routines', user] },
        { throwOnError: true },
      );
      if (routine) {
        const current = await repository.findById(id);
        if (!current) throw new OperationError('notFound');
        setBase(current);
        await choices.refetch({ throwOnError: true });
      }
    },
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [write.locked, onLock]);
  const disabled = write.blocked;
  async function save() {
    const config: RoutineConfiguration = {
      ...(schedule === 'daily'
        ? { scheduleType: 'daily' }
        : { scheduleType: 'weekdays', weekdayMask: mask }),
      steps,
    };
    const unchanged =
      base &&
      JSON.stringify(configOf(base, context.today)) === JSON.stringify(config);
    const input: CreateRoutine | EditRoutine =
      write.pending ??
      (base
        ? {
            operationId: randomUUID(),
            routineId: id,
            name,
            expectedUpdatedAt: base.updatedAt,
            ...(!unchanged ? { configuration: config } : {}),
          }
        : { id, name, ...config });
    const result = await write.run(input);
    if (result) onSaved(result);
  }
  function update(index: number, value: RoutineStep) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? value : step)),
    );
  }
  function move(index: number, direction: number) {
    setSteps((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction]!,
        next[index]!,
      ];
      return next;
    });
  }
  const available = (choices.data ?? []).filter(
    (habit) =>
      !steps.some(
        (step) => step.kind === 'habit' && step.habitId === habit.id,
      ) &&
      habit.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <Card>
        <Input
          label={t('routines.name')}
          hint={t('habits.nameHint')}
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={!disabled}
        />
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          {routine
            ? t('routines.editEffective', {
                date: format.businessDate(effective, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              })
            : t('habits.startsToday')}
        </Text>
        {base && (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('routines.savedName', { name: base.name })}
          </Text>
        )}
      </Card>
      {base && write.notice === 'reviewed' && (
        <Card>
          <Text accessibilityRole="header" weight="bold">
            {t('routines.currentConfiguration')}
          </Text>
          <Text weight="semibold">{base.name}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {t('routines.draftKept')}
          </Text>
          <Text>
            {t(
              configOf(base, context.today).scheduleType === 'daily'
                ? 'habits.daily'
                : 'habits.weekdays',
            )}
          </Text>
          {configOf(base, context.today).scheduleType === 'weekdays' && (
            <Text>
              {([1, 2, 3, 4, 5, 6, 7] as const)
                .filter((day) => {
                  const config = configOf(base, context.today);
                  return (
                    config.scheduleType === 'weekdays' &&
                    (config.weekdayMask & (1 << (day - 1))) !== 0
                  );
                })
                .map((day) => t(`habits.days.${day}`))
                .join(', ')}
            </Text>
          )}
          {configOf(base, context.today).steps.map((step) => (
            <Text key={step.id} style={{ fontSize: 13 }}>
              {t('routines.savedStep', {
                name:
                  step.kind === 'own'
                    ? step.title
                    : (choices.data?.find((habit) => habit.id === step.habitId)
                        ?.name ?? t('routines.loading')),
                requirement: t(
                  step.required ? 'routines.required' : 'routines.optional',
                ),
              })}
            </Text>
          ))}
        </Card>
      )}
      <HabitScheduleFields
        schedule={schedule}
        mask={mask}
        weekly=""
        allowWeekly={false}
        disabled={disabled}
        onScheduleChange={(value) => {
          if (value !== 'weekly') setSchedule(value);
        }}
        onMaskChange={setMask}
        onWeeklyChange={() => undefined}
      />
      <Text accessibilityRole="header" weight="bold" style={{ fontSize: 20 }}>
        {t('routines.steps')}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {t('routines.stepsHint')}
      </Text>
      {choices.isError && (
        <>
          <ErrorMessage
            message={t(`routines.errors.${operationErrorCode(choices.error)}`)}
          />
          <Button
            title={t('common.retry')}
            onPress={() => {
              void choices.refetch();
            }}
          />
        </>
      )}
      {steps.map((step, index) => {
        const habit =
          step.kind === 'habit'
            ? choices.data?.find((value) => value.id === step.habitId)
            : undefined;
        const flexible =
          habit &&
          habitAtDate(habit, routine ? effective : context.today).definition
            .scheduleType === 'weekly';
        return (
          <Card key={step.id}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text weight="bold" style={{ flex: 1 }}>
                {t('routines.stepNumber', { number: format.number(index + 1) })}
              </Text>
              <IconButton
                label={t('routines.moveUp', {
                  number: format.number(index + 1),
                })}
                icon="arrow-up"
                disabled={disabled || index === 0}
                onPress={() => move(index, -1)}
              />
              <IconButton
                label={t('routines.moveDown', {
                  number: format.number(index + 1),
                })}
                icon="arrow-down"
                disabled={disabled || index === steps.length - 1}
                onPress={() => move(index, 1)}
              />
              <IconButton
                label={t('routines.removeStep', {
                  number: format.number(index + 1),
                })}
                icon="trash-2"
                disabled={disabled || steps.length === 1}
                onPress={() =>
                  setSteps((current) => current.filter((_, i) => i !== index))
                }
              />
            </View>
            {step.kind === 'own' ? (
              <Input
                label={t('routines.stepName', {
                  number: format.number(index + 1),
                })}
                value={step.title}
                onChangeText={(title) => update(index, { ...step, title })}
                editable={!disabled}
                maxLength={100}
              />
            ) : (
              <>
                <Text weight="semibold">
                  {habit?.name ?? t('routines.loading')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {t('routines.linked')}
                </Text>
                {flexible && (
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    {t('routines.flexibleHint')}
                  </Text>
                )}
              </>
            )}
            <Button
              title={t(
                step.required ? 'routines.required' : 'routines.optional',
              )}
              selected={step.required}
              variant={step.required ? 'primary' : 'secondary'}
              disabled={disabled || (!!flexible && !step.required)}
              onPress={() =>
                update(index, { ...step, required: !step.required })
              }
            />
          </Card>
        );
      })}
      <Button
        title={t('routines.addOwn')}
        icon="plus"
        variant="secondary"
        disabled={disabled || steps.length >= 30}
        onPress={() =>
          setSteps((current) => [
            ...current,
            { id: randomUUID(), kind: 'own', title: '', required: true },
          ])
        }
      />
      <Button
        title={t('routines.addHabit')}
        icon="link"
        variant="secondary"
        disabled={disabled || steps.length >= 30}
        onPress={() => setChoosing((value) => !value)}
      />
      {choosing && (
        <Card>
          <Input
            label={t('routines.searchHabits')}
            value={search}
            onChangeText={setSearch}
            editable={!disabled}
          />
          {choices.isPending && <Text>{t('habits.loading')}</Text>}
          {choices.isSuccess && !available.length && (
            <Text>{t('routines.noHabitChoices')}</Text>
          )}
          {available.map((habit) => (
            <Button
              key={habit.id}
              title={habit.name}
              variant="secondary"
              disabled={disabled}
              onPress={() => {
                const flexible =
                  habitAtDate(habit, routine ? effective : context.today)
                    .definition.scheduleType === 'weekly';
                setSteps((current) => [
                  ...current,
                  {
                    id: randomUUID(),
                    kind: 'habit',
                    habitId: habit.id,
                    required: !flexible,
                  },
                ]);
                setChoosing(false);
                setSearch('');
              }}
            />
          ))}
        </Card>
      )}
      <RoutineWriteFeedback
        error={write.error}
        notice={write.notice}
        pending={!!write.pending}
        busy={write.busy}
        review={write.review}
        onRetry={() => {
          void save();
        }}
        onReload={() => {
          void write.reload().then((savedId) => {
            if (savedId) onSaved(savedId);
          });
        }}
      />
      <Button
        title={t(routine ? 'routines.saveChanges' : 'routines.create')}
        loading={write.busy}
        disabled={
          disabled ||
          (steps.some((step) => step.kind === 'habit') && !choices.isSuccess)
        }
        onPress={() => {
          void save();
        }}
      />
    </>
  );
}
