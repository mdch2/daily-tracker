import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import type { Habit } from '@/features/habits/domain/habit';
import { habitAtDate } from '@/features/habits/domain/habit-rules';
import { parseMilliunits } from '@/features/habits/application/habit-actions';
import { Button, Input, Text, ErrorMessage } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { IconButton } from '@/shared/ui/icon-button';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import {
  OperationError,
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';
import { useConfirmedWrite } from '@/shared/presentation/use-confirmed-write';
import type {
  CreateGoal,
  EditGoal,
  GoalDefinition,
  GoalMetric,
  GoalReceipt,
} from '../domain/goal';
import { createGoalActions } from '../application/goal-actions';
import { useGoalRepository } from './goal-context';
import { GoalWriteFeedback } from './goal-write-feedback';

export function GoalForm({
  goal,
  context,
  onSaved,
  onLock,
}: {
  goal?: GoalDefinition;
  context: ReadyBusinessContext;
  onSaved: (id: string) => void;
  onLock: (locked: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  const { state } = useAuth();
  const client = useQueryClient();
  const repository = useGoalRepository();
  const habits = useHabitRepository();
  const [goalId] = useState(() => goal?.id ?? randomUUID());
  const [base, setBase] = useState(goal);
  const [name, setName] = useState(goal?.name ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [mode, setMode] = useState<'amount' | 'milestones'>(
    goal?.mode ?? 'amount',
  );
  const [source, setSource] = useState<'manual' | 'habit'>(
    goal?.progressSource ?? 'manual',
  );
  const [start, setStart] = useState(goal?.startDate ?? context.today);
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [unit, setUnit] = useState(goal?.unitLabel ?? '');
  const [target, setTarget] = useState(
    goal?.targetMilliunits ? String(goal.targetMilliunits / 1000) : '',
  );
  const [metric, setMetric] = useState<GoalMetric>(
    goal?.linkedMetric ?? 'amount',
  );
  const [selected, setSelected] = useState<Habit | null>(null);
  const [choicePage, setChoicePage] = useState(0);
  const [items, setItems] = useState(() => [
    { id: randomUUID(), name: '', threshold: '' },
  ]);
  const [localError, setLocalError] = useState<OperationErrorCode | null>(null);
  const user = state.session?.userId;
  const choices = useQuery({
    queryKey: ['habits', user, 'goal-choices', choicePage],
    queryFn: () => habits.list(choicePage * 30),
    enabled: !goal && source === 'habit',
  });
  const actions = createGoalActions(repository);
  const write = useConfirmedWrite<CreateGoal | EditGoal, GoalReceipt>(
    (input) =>
      'expectedVersion' in input ? actions.edit(input) : actions.create(input),
    async () => {
      await client.invalidateQueries(
        { queryKey: ['goals', user] },
        { throwOnError: true },
      );
      if (goal) {
        const latest = await repository.findById(goalId);
        if (!latest.goal) throw new OperationError('notFound');
        setBase(latest.goal.definition);
      }
    },
  );
  useEffect(() => {
    onLock(write.locked);
    return () => onLock(false);
  }, [onLock, write.locked]);
  const disabled = write.blocked || !!base?.archivedAt;
  async function save() {
    setLocalError(null);
    try {
      let input: CreateGoal | EditGoal;
      if (write.pending) input = write.pending;
      else if (base)
        input = {
          operationId: randomUUID(),
          goalId,
          expectedVersion: base.version,
          name,
          description: description || null,
          deadline: deadline || null,
          targetMilliunits: mode === 'amount' ? parseMilliunits(target) : null,
        };
      else {
        const common = {
          operationId: randomUUID(),
          goalId,
          name,
          description: description || null,
          startDate: start,
          deadline: deadline || null,
        };
        if (start < context.today) throw new OperationError('ineligibleDate');
        if (source === 'manual')
          input =
            mode === 'amount'
              ? {
                  ...common,
                  mode,
                  progressSource: source,
                  unitLabel: unit,
                  targetMilliunits: parseMilliunits(target),
                }
              : {
                  ...common,
                  mode,
                  progressSource: source,
                  milestones: items.map((item) => ({
                    id: item.id,
                    name: item.name,
                  })),
                };
        else {
          if (!selected) throw new OperationError('invalidInput');
          const origin = {
            progressSource: source,
            habitId: selected.id,
            linkedMetric: metric,
          } as const;
          input =
            mode === 'amount'
              ? {
                  ...common,
                  ...origin,
                  mode,
                  targetMilliunits: parseMilliunits(target),
                }
              : {
                  ...common,
                  ...origin,
                  mode,
                  milestones: items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    thresholdMilliunits: parseMilliunits(item.threshold),
                  })),
                };
        }
      }
      const result = await write.run(input);
      if (result) onSaved(result.goalId);
    } catch (failure) {
      setLocalError(operationErrorCode(failure));
    }
  }
  function move(index: number, direction: number) {
    setItems((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction]!,
        next[index]!,
      ];
      return next;
    });
  }
  return (
    <>
      <Card>
        <Input
          label={t('goals.name')}
          value={name}
          editable={!disabled}
          onChangeText={setName}
        />
        <Input
          label={t('goals.description')}
          value={description}
          editable={!disabled}
          onChangeText={setDescription}
          multiline
          hint={t('goals.descriptionHint', {
            count: [...description].length,
            value: format.number([...description].length),
          })}
        />
        {base && (
          <>
            <Text style={{ color: colors.muted }}>
              {t('goals.immutableHint')}
            </Text>
            <Text>
              {t('goals.version', { value: format.number(base.version) })}
            </Text>
          </>
        )}
        {!base && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['amount', 'milestones'] as const).map((value) => (
                <View key={value} style={{ flex: 1 }}>
                  <Button
                    title={t(`goals.${value}`)}
                    selected={mode === value}
                    disabled={disabled}
                    onPress={() => setMode(value)}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['manual', 'habit'] as const).map((value) => (
                <View key={value} style={{ flex: 1 }}>
                  <Button
                    title={t(`goals.${value}`)}
                    selected={source === value}
                    disabled={disabled}
                    onPress={() => setSource(value)}
                  />
                </View>
              ))}
            </View>
            <Input
              label={t('goals.start')}
              hint={t('goals.dateHint')}
              value={start}
              editable={!disabled}
              onChangeText={setStart}
              autoCapitalize="none"
            />
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {t('goals.startHint')}
            </Text>
          </>
        )}
        <Input
          label={t('goals.deadline')}
          hint={t('goals.deadlineHint')}
          value={deadline}
          editable={!disabled}
          onChangeText={setDeadline}
          autoCapitalize="none"
        />
      </Card>
      {!base && source === 'habit' && (
        <Card>
          <Text weight="bold">{t('goals.chooseHabit')}</Text>
          <Text style={{ color: colors.muted }}>{t('goals.sourceHint')}</Text>
          {selected && (
            <Text>{t('goals.selectedHabit', { name: selected.name })}</Text>
          )}
          {choices.isPending && <Text>{t('goals.loading')}</Text>}
          {choices.isError && (
            <>
              <ErrorMessage
                message={t(`goals.errors.${operationErrorCode(choices.error)}`)}
              />
              <Button
                title={t('common.retry')}
                disabled={disabled}
                onPress={() => {
                  void choices.refetch();
                }}
              />
            </>
          )}
          {choices.data?.habits.length === 0 && (
            <Text>{t('goals.noHabits')}</Text>
          )}
          {choices.data?.habits.map((habit) => (
            <Button
              key={habit.id}
              title={habit.name}
              selected={selected?.id === habit.id}
              disabled={disabled || choices.isError}
              onPress={() => {
                setSelected(habit);
                if (
                  habitAtDate(habit, context.today).definition
                    .measurementMode === 'binary'
                )
                  setMetric('completed_days');
              }}
            />
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {choicePage > 0 && (
              <Button
                title={t('goals.newer')}
                disabled={disabled}
                onPress={() => setChoicePage((value) => value - 1)}
              />
            )}
            {choices.data?.hasMore && (
              <Button
                title={t('goals.older')}
                disabled={disabled}
                onPress={() => setChoicePage((value) => value + 1)}
              />
            )}
          </View>
          <Button
            title={t('goals.accumulated')}
            selected={metric === 'amount'}
            disabled={
              disabled ||
              !selected ||
              habitAtDate(selected, context.today).definition
                .measurementMode !== 'quantity'
            }
            onPress={() => setMetric('amount')}
          />
          <Button
            title={t('goals.completedDays')}
            selected={metric === 'completed_days'}
            disabled={disabled || !selected}
            onPress={() => setMetric('completed_days')}
          />
          {selected && metric === 'amount' && (
            <Text>
              {habitAtDate(selected, context.today).definition
                .measurementMode === 'quantity'
                ? t('goals.sourceUnit', {
                    unit:
                      selected.definition.measurementMode === 'quantity'
                        ? selected.definition.unitLabel
                        : '',
                  })
                : t('goals.completedDays')}
            </Text>
          )}
        </Card>
      )}
      {mode === 'amount' && (
        <Card>
          {source === 'manual' && !base && (
            <Input
              label={t('goals.unit')}
              value={unit}
              onChangeText={setUnit}
              editable={!disabled}
            />
          )}
          <Input
            label={t('goals.target')}
            hint={t(
              source === 'habit' && metric === 'completed_days'
                ? 'goals.wholeDaysHint'
                : 'goals.quantityHint',
            )}
            value={target}
            onChangeText={setTarget}
            editable={!disabled}
            keyboardType="decimal-pad"
          />
        </Card>
      )}
      {!base && mode === 'milestones' && (
        <Card>
          <Text weight="bold">{t('goals.milestones')}</Text>
          {items.map((item, index) => (
            <View
              key={item.id}
              style={{
                gap: 8,
                backgroundColor: colors.elevated,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Input
                label={t('goals.milestoneName', {
                  value: format.number(index + 1),
                })}
                value={item.name}
                editable={!disabled}
                onChangeText={(value) =>
                  setItems((current) =>
                    current.map((entry) =>
                      entry.id === item.id ? { ...entry, name: value } : entry,
                    ),
                  )
                }
              />
              {source === 'habit' && (
                <Input
                  label={t('goals.threshold')}
                  hint={t(
                    metric === 'completed_days'
                      ? 'goals.wholeDaysHint'
                      : 'goals.thresholdHint',
                  )}
                  value={item.threshold}
                  editable={!disabled}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, threshold: value }
                          : entry,
                      ),
                    )
                  }
                />
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconButton
                  label={t('goals.moveUp', { value: format.number(index + 1) })}
                  icon="arrow-up"
                  disabled={disabled || index === 0}
                  onPress={() => move(index, -1)}
                />
                <IconButton
                  label={t('goals.moveDown', {
                    value: format.number(index + 1),
                  })}
                  icon="arrow-down"
                  disabled={disabled || index === items.length - 1}
                  onPress={() => move(index, 1)}
                />
                <IconButton
                  label={t('goals.removeMilestone', {
                    value: format.number(index + 1),
                  })}
                  icon="trash-2"
                  disabled={disabled || items.length === 1}
                  onPress={() =>
                    setItems((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    )
                  }
                />
              </View>
            </View>
          ))}
          <Button
            title={t('goals.addMilestone')}
            disabled={disabled || items.length >= 30}
            onPress={() =>
              setItems((current) => [
                ...current,
                { id: randomUUID(), name: '', threshold: '' },
              ])
            }
          />
        </Card>
      )}
      {localError && <ErrorMessage message={t(`goals.errors.${localError}`)} />}
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
            if (result) onSaved(result.goalId);
          });
        }}
      />
      <Button
        title={t('goals.save')}
        variant="primary"
        loading={write.busy}
        disabled={disabled}
        onPress={() => {
          void save();
        }}
      />
    </>
  );
}
