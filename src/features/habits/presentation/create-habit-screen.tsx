import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import {
  OperationError,
  operationErrorCode,
  type OperationErrorCode,
} from '@/shared/domain/operation-error';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import { RouteLink } from '@/shared/ui/route-link';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import type { CreateHabit, Measurement, Schedule } from '../domain/habit';
import {
  createHabitActions,
  parseMilliunits,
} from '../application/habit-actions';
import { useHabitRepository } from './habit-context';

function CreateHabitForm() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const repository = useHabitRepository();
  const [id] = useState(randomUUID);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Measurement['measurementMode']>('binary');
  const [schedule, setSchedule] = useState<Schedule['scheduleType']>('daily');
  const [mask, setMask] = useState(0);
  const [weekly, setWeekly] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<OperationErrorCode | null>(null);
  const [pending, setPending] = useState<CreateHabit | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation({
    mutationFn: createHabitActions(repository).create,
  });
  const disabled = mutation.isPending || !!pending;
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setError(null);
    try {
      if (schedule === 'weekly' && !/^[1-7]$/.test(weekly))
        throw new OperationError('invalidInput');
      const input: CreateHabit = pending ?? {
        id,
        name,
        ...(mode === 'binary'
          ? { measurementMode: 'binary' as const }
          : {
              measurementMode: 'quantity' as const,
              unitLabel: unit,
              targetMilliunits: parseMilliunits(target),
            }),
        ...(schedule === 'daily'
          ? { scheduleType: 'daily' as const }
          : schedule === 'weekdays'
            ? { scheduleType: 'weekdays' as const, weekdayMask: mask }
            : {
                scheduleType: 'weekly' as const,
                weeklyTarget: Number(weekly),
              }),
      };
      // Keep this exact identity and content if delivery/response is uncertain.
      setPending(input);
      try {
        const savedId = await mutation.mutateAsync(input);
        if (!mounted.current) return;
        await client.invalidateQueries({
          queryKey: ['habits', state.session?.userId],
          refetchType: 'none',
        });
        router.replace({ pathname: '/habits/[id]', params: { id: savedId } });
      } catch (failure) {
        if (!mounted.current) return;
        const code = operationErrorCode(failure);
        setError(code);
        if (code !== 'network' && code !== 'service') setPending(null);
      }
    } catch (failure) {
      setError(operationErrorCode(failure));
    } finally {
      lock.current = false;
    }
  }
  return (
    <Screen>
      <Text accessibilityRole="header">{t('habits.create')}</Text>
      <Text>{t('habits.startsToday')}</Text>
      <Input
        label={t('habits.name')}
        hint={t('habits.nameHint')}
        value={name}
        onChangeText={setName}
        maxLength={100}
        editable={!disabled}
      />
      <Text>{t('habits.measurement')}</Text>
      {(['binary', 'quantity'] as const).map((value) => (
        <Button
          key={value}
          title={t(`habits.${value}`)}
          selected={mode === value}
          disabled={disabled}
          onPress={() => setMode(value)}
        />
      ))}
      {mode === 'quantity' && (
        <>
          <Input
            label={t('habits.unit')}
            hint={t('habits.unitHint')}
            value={unit}
            onChangeText={setUnit}
            maxLength={30}
            editable={!disabled}
          />
          <Input
            label={t('habits.target')}
            hint={t('habits.amountHint')}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            editable={!disabled}
          />
        </>
      )}
      <Text>{t('habits.schedule')}</Text>
      {(['daily', 'weekdays', 'weekly'] as const).map((value) => (
        <Button
          key={value}
          title={t(`habits.${value}`)}
          selected={schedule === value}
          disabled={disabled}
          onPress={() => setSchedule(value)}
        />
      ))}
      {schedule === 'weekdays' &&
        ([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
          <Button
            key={day}
            title={t(`habits.days.${day}`)}
            selected={(mask & (1 << (day - 1))) !== 0}
            disabled={disabled}
            onPress={() => setMask((value) => value ^ (1 << (day - 1)))}
          />
        ))}
      {schedule === 'weekly' && (
        <Input
          label={t('habits.weeklyTarget')}
          hint={t('habits.weeklyHint')}
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
        />
      )}
      {error && <ErrorMessage message={t(`habits.errors.${error}`)} />}
      {pending && error && <Text>{t('habits.uncertain')}</Text>}
      <Button
        title={t(pending && error ? 'habits.retrySave' : 'habits.create')}
        loading={mutation.isPending}
        onPress={() => {
          void save();
        }}
      />
      <RouteLink href="/(tabs)/habits" disabled={disabled}>
        {t('habits.back')}
      </RouteLink>
      <PreferencesControls />
    </Screen>
  );
}
export function CreateHabitScreen() {
  return (
    <BusinessCalendarGate>{() => <CreateHabitForm />}</BusinessCalendarGate>
  );
}
