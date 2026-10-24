import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { useTheme } from '@/shared/theme/use-theme';
import {
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';
import { Button, ErrorMessage, Input, Text } from '@/shared/ui/primitives';
import type { Habit, HabitDayRecord, RecordHabitDay } from '../domain/habit';
import { canRecord, habitAtDate } from '../domain/habit-rules';
import {
  createHabitActions,
  parseMilliunits,
} from '../application/habit-actions';
import { useHabitRepository } from './habit-context';

export function HabitDayEditor({
  habit: sourceHabit,
  date,
  today,
  record,
  refresh,
  onLock,
  dataCurrent = true,
}: {
  habit: Habit;
  date: string;
  today: string;
  record: HabitDayRecord | undefined;
  refresh: () => Promise<HabitDayRecord[]>;
  onLock: (locked: boolean) => void;
  dataCurrent?: boolean;
}) {
  const habit = habitAtDate(sourceHabit, date);
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const repository = useHabitRepository();
  const mutation = useMutation({
    mutationFn: createHabitActions(repository).record,
  });
  const [amount, setAmount] = useState('');
  const [quantityMode, setQuantityMode] = useState<'add_amount' | 'set_total'>(
    date === today ? 'add_amount' : 'set_total',
  );
  const [baseRevision, setBaseRevision] = useState(record?.revision ?? 0);
  const [pending, setPending] = useState<RecordHabitDay | null>(null);
  const [error, setError] = useState<OperationErrorCode | null>(null);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [notice, setNotice] = useState<
    'saved' | 'savedRefreshFailed' | 'reviewed' | null
  >(null);
  const [reloading, setReloading] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const busy = mutation.isPending || reloading;
  useEffect(() => {
    onLock(busy || !!pending);
    return () => onLock(false);
  }, [busy, pending, onLock]);

  async function reload() {
    if (lock.current) return;
    lock.current = true;
    setReloading(true);
    try {
      const rows = await refresh();
      if (!mounted.current) return;
      setBaseRevision(
        rows.find((row) => row.habitId === habit.id && row.date === date)
          ?.revision ?? 0,
      );
      setReviewRequired(false);
      setError(null);
      setNotice('reviewed');
    } catch (failure) {
      if (mounted.current) setError(operationErrorCode(failure));
    } finally {
      lock.current = false;
      if (mounted.current) setReloading(false);
    }
  }
  async function save(kind: RecordHabitDay['kind'], binaryValue?: boolean) {
    if (lock.current) return;
    lock.current = true;
    setError(null);
    setNotice(null);
    try {
      const input: RecordHabitDay = pending ?? {
        operationId: randomUUID(),
        habitId: habit.id,
        date,
        ...(kind === 'set_binary'
          ? { kind, binaryValue: !!binaryValue, expectedRevision: baseRevision }
          : kind === 'set_total'
            ? {
                kind,
                amountMilliunits: parseMilliunits(amount),
                expectedRevision: baseRevision,
              }
            : { kind, amountMilliunits: parseMilliunits(amount) }),
      };
      setPending(input);
      try {
        await mutation.mutateAsync(input);
      } catch (failure) {
        if (!mounted.current) return;
        const code = operationErrorCode(failure);
        setError(code);
        if (code !== 'service' && code !== 'network') setPending(null);
        if (code === 'conflict' || code === 'operationReused')
          setReviewRequired(true);
        return;
      }
      if (!mounted.current) return;
      // A receipt proves this operation, but may precede newer writes. Read current state.
      setPending(null);
      setNotice('saved');
      setAmount('');
      setReloading(true);
      try {
        const rows = await refresh();
        if (mounted.current) {
          setBaseRevision(
            rows.find((row) => row.habitId === habit.id && row.date === date)
              ?.revision ?? 0,
          );
          setReviewRequired(false);
        }
      } catch {
        if (mounted.current) {
          setNotice('savedRefreshFailed');
          setReviewRequired(true);
        }
      }
    } catch (failure) {
      if (mounted.current) setError(operationErrorCode(failure));
    } finally {
      lock.current = false;
      if (mounted.current) setReloading(false);
    }
  }
  // A confirmed retry remains possible even if midnight has expired the date.
  const writable = canRecord(habit, date, today);
  const blocked =
    busy || !!pending || reviewRequired || !writable || !dataCurrent;
  return (
    <>
      {!writable && <Text>{t('habits.readOnly')}</Text>}
      {habit.definition.measurementMode === 'quantity' && (
        <Input
          label={t(
            quantityMode === 'add_amount'
              ? 'habits.quantityEntry.addLabel'
              : 'habits.quantityEntry.totalLabel',
            { unit: habit.definition.unitLabel },
          )}
          hint={t(
            quantityMode === 'add_amount'
              ? 'habits.quantityEntry.addHint'
              : 'habits.quantityEntry.totalHint',
          )}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!blocked}
        />
      )}
      {error && <ErrorMessage message={t(`habits.errors.${error}`)} />}
      {notice && (
        <Text accessibilityLiveRegion="polite">{t(`habits.${notice}`)}</Text>
      )}
      {pending && error ? (
        <>
          <Text>{t('habits.uncertain')}</Text>
          <Button
            title={t('habits.retrySave')}
            loading={busy}
            onPress={() => {
              void save(pending.kind);
            }}
          />
        </>
      ) : habit.definition.measurementMode === 'binary' ? (
        <>
          <Button
            title={t('habits.complete')}
            disabled={blocked}
            loading={mutation.isPending}
            onPress={() => {
              void save('set_binary', true);
            }}
          />
          <Button
            title={t('habits.undo')}
            variant="secondary"
            disabled={blocked}
            onPress={() => {
              void save('set_binary', false);
            }}
          />
        </>
      ) : (
        <>
          <Button
            title={t(
              quantityMode === 'add_amount' ? 'habits.add' : 'habits.setTotal',
            )}
            disabled={blocked}
            loading={mutation.isPending}
            onPress={() => {
              void save(quantityMode);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              quantityMode === 'add_amount'
                ? 'habits.quantityEntry.correctTotal'
                : 'habits.quantityEntry.backToAdd',
            )}
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            onPress={() => {
              setQuantityMode((value) =>
                value === 'add_amount' ? 'set_total' : 'add_amount',
              );
              setAmount('');
            }}
            style={{
              minHeight: tokens.minimumTouchTarget,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{ color: colors.link, textAlign: 'center', fontSize: 14 }}
            >
              {t(
                quantityMode === 'add_amount'
                  ? 'habits.quantityEntry.correctTotal'
                  : 'habits.quantityEntry.backToAdd',
              )}
            </Text>
          </Pressable>
        </>
      )}
      {!pending && (reviewRequired || !dataCurrent || error !== null) && (
        <Button
          title={t('habits.reload')}
          variant="secondary"
          loading={reloading}
          disabled={busy}
          onPress={() => {
            void reload();
          }}
        />
      )}
    </>
  );
}
