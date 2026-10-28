import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { Button, ErrorMessage, Input, Text } from '@/shared/ui/primitives';
import {
  OperationError,
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';
import type { Habit, RenameHabit, EditHabit, Schedule } from '../domain/habit';
import {
  createHabitActions,
  parseMilliunits,
} from '../application/habit-actions';
import {
  definitionFor,
  pendingDefinition,
  addBusinessDays,
  weekStart,
} from '../domain/habit-rules';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { useHabitRepository } from './habit-context';
import { HabitSheet } from './habit-sheet';
import { HabitScheduleFields } from './habit-schedule-fields';
import { HabitFormCard } from './habit-form-controls';
import { HabitDefinitionSummary } from './habit-definition-summary';

export function HabitSettingsEditor({
  habit,
  today,
  onClose,
}: {
  habit: Habit;
  today: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const repository = useHabitRepository();
  const { state } = useAuth();
  const client = useQueryClient();
  const format = useLocalizedFormatters();
  const [baseline, setBaseline] = useState(
    () => pendingDefinition(habit, today) ?? definitionFor(habit, today),
  );
  const [schedule, setSchedule] = useState<Schedule['scheduleType']>(
    baseline.scheduleType,
  );
  const [mask, setMask] = useState(
    baseline.scheduleType === 'weekdays' ? baseline.weekdayMask : 0,
  );
  const [weekly, setWeekly] = useState(
    baseline.scheduleType === 'weekly' ? String(baseline.weeklyTarget) : '',
  );
  const [target, setTarget] = useState(
    baseline.measurementMode === 'quantity'
      ? String(baseline.targetMilliunits / 1000)
      : '',
  );
  const effectiveFrom = addBusinessDays(
    weekStart(today, habit.definition.weekStartDay),
    7,
  );
  const [name, setName] = useState(habit.name);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(habit.updatedAt);
  const [latestName, setLatestName] = useState(habit.name);
  const [pending, setPending] = useState<RenameHabit | EditHabit | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [error, setError] = useState<OperationErrorCode | null>(null);
  const lock = useRef(false);
  const disabled = busy || !!pending || saved;

  async function refresh() {
    await client.invalidateQueries({
      queryKey: ['routines', state.session?.userId],
    });
    await client.invalidateQueries({
      queryKey: ['habits', state.session?.userId],
      refetchType: 'none',
    });
    await client.refetchQueries(
      { queryKey: ['habits', state.session?.userId], type: 'active' },
      { throwOnError: true },
    );
  }
  async function save() {
    if (lock.current || reviewRequired) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (saved) {
        await refresh();
        onClose();
        return;
      }
      const targetMilliunits =
        baseline.measurementMode === 'quantity'
          ? parseMilliunits(target)
          : null;
      const configurationChanged =
        schedule !== baseline.scheduleType ||
        (schedule === 'weekdays' &&
          baseline.scheduleType === 'weekdays' &&
          mask !== baseline.weekdayMask) ||
        (schedule === 'weekly' &&
          baseline.scheduleType === 'weekly' &&
          Number(weekly) !== baseline.weeklyTarget) ||
        (baseline.measurementMode === 'quantity' &&
          targetMilliunits !== baseline.targetMilliunits);
      if (!pending && schedule === 'weekly' && !/^[1-7]$/.test(weekly))
        throw new OperationError('invalidInput');
      const input: RenameHabit | EditHabit = pending ?? {
        operationId: randomUUID(),
        habitId: habit.id,
        name,
        expectedUpdatedAt: baseUpdatedAt,
        ...(configurationChanged
          ? {
              targetMilliunits,
              ...(schedule === 'daily'
                ? { scheduleType: 'daily' as const }
                : schedule === 'weekdays'
                  ? { scheduleType: 'weekdays' as const, weekdayMask: mask }
                  : {
                      scheduleType: 'weekly' as const,
                      weeklyTarget: Number(weekly),
                    }),
            }
          : {}),
      };
      setPending(input);
      try {
        const actions = createHabitActions(repository);
        if ('scheduleType' in input) await actions.edit(input);
        else await actions.rename(input);
      } catch (failure) {
        const code = operationErrorCode(failure);
        setError(code);
        if (code !== 'network' && code !== 'service') setPending(null);
        if (code === 'conflict' || code === 'operationReused')
          setReviewRequired(true);
        return;
      }
      setPending(null);
      setSaved(true);
      await refresh();
      onClose();
    } catch (failure) {
      setError(operationErrorCode(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (lock.current || pending) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const latest = await repository.findById(habit.id);
      if (!latest) throw new OperationError('notFound');
      setBaseUpdatedAt(latest.updatedAt);
      setLatestName(latest.name);
      setBaseline(
        pendingDefinition(latest, today) ?? definitionFor(latest, today),
      );
      setReviewRequired(false);
    } catch (failure) {
      setError(operationErrorCode(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <HabitSheet
      title={t('habits.edit.title')}
      locked={busy || !!pending}
      onClose={onClose}
    >
      <Text>{t('habits.rename.description')}</Text>
      <Input
        label={t('habits.name')}
        value={name}
        onChangeText={setName}
        editable={!disabled}
        maxLength={100}
      />
      <HabitScheduleFields
        schedule={schedule}
        mask={mask}
        weekly={weekly}
        disabled={disabled}
        onScheduleChange={setSchedule}
        onMaskChange={setMask}
        onWeeklyChange={setWeekly}
      />
      {baseline.measurementMode === 'quantity' && (
        <HabitFormCard>
          <Input
            label={t('habits.target')}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            editable={!disabled}
          />
          <Text>
            {t('habits.edit.unitFixed', { unit: baseline.unitLabel })}
          </Text>
        </HabitFormCard>
      )}
      <Text>
        {t('habits.edit.effective', {
          date: format.businessDate(effectiveFrom, { dateStyle: 'full' }),
        })}
      </Text>
      <Text>{t('habits.rename.currentName', { name: latestName })}</Text>
      <HabitDefinitionSummary definition={baseline} />
      {error && <ErrorMessage message={t(`habits.errors.${error}`)} />}
      {saved && (
        <Text accessibilityLiveRegion="polite">
          {t(error ? 'habits.savedRefreshFailed' : 'habits.saved')}
        </Text>
      )}
      {pending && error && <Text>{t('habits.uncertain')}</Text>}
      {reviewRequired ? (
        <Button
          title={t('habits.reload')}
          loading={busy}
          onPress={() => {
            void reload();
          }}
        />
      ) : (
        <Button
          title={t(
            saved
              ? 'common.retry'
              : pending && error
                ? 'habits.retrySave'
                : 'habits.edit.save',
          )}
          loading={busy}
          disabled={!saved && !pending && !name.trim()}
          onPress={() => {
            void save();
          }}
        />
      )}
    </HabitSheet>
  );
}
