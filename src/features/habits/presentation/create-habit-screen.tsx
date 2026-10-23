import { Pressable, View } from 'react-native';
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
import { Icon } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
import { HabitFormCard, HabitFormChoice } from './habit-form-controls';
import type { CreateHabit, Measurement, Schedule } from '../domain/habit';
import {
  createHabitActions,
  parseMilliunits,
} from '../application/habit-actions';
import { useHabitRepository } from './habit-context';

function CreateHabitForm() {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
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
    <Screen
      contentStyle={{ padding: tokens.spacing.md, gap: tokens.spacing.md }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('habits.back')}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => router.replace('/(tabs)/habits')}
          style={({ pressed }) => ({
            minHeight: tokens.minimumTouchTarget,
            minWidth: tokens.minimumTouchTarget,
            borderRadius: tokens.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.elevated : colors.background,
            opacity: disabled ? 0.55 : 1,
          })}
        >
          <Icon name="arrow-left" color={colors.text} />
        </Pressable>
        <Text
          accessibilityRole="header"
          weight="bold"
          style={{ flex: 1, textAlign: 'center', fontSize: 20 }}
        >
          {t('habits.create')}
        </Text>
        <View style={{ width: tokens.minimumTouchTarget }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.md,
          backgroundColor: colors.accentSoft,
          padding: tokens.spacing.md,
          borderRadius: tokens.radius.card,
        }}
      >
        <View
          style={{
            backgroundColor: colors.selection,
            padding: 12,
            borderRadius: tokens.radius.control,
          }}
        >
          <Icon name="sunrise" size={26} color={colors.link} />
        </View>
        <View style={{ flex: 1, gap: tokens.spacing.xs }}>
          <Text weight="bold">{t('habits.designTitle')}</Text>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {t('habits.designDescription')}
          </Text>
        </View>
      </View>

      <HabitFormCard>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <Icon name="edit-3" color={colors.link} />
          <Text weight="bold" style={{ flex: 1 }}>
            {t('habits.identity')}
          </Text>
          <Text style={{ color: colors.link, fontSize: 12 }}>
            {t('habits.required')}
          </Text>
        </View>
        <Input
          label={t('habits.name')}
          hint={t('habits.nameHint')}
          icon="bookmark"
          placeholder={t('habits.namePlaceholder')}
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={!disabled}
        />
      </HabitFormCard>

      <HabitFormCard>
        <Text accessibilityRole="header" weight="bold">
          {t('habits.scheduledFrequency')}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          {t('habits.frequencyDescription')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.spacing.sm,
          }}
        >
          {(['daily', 'weekdays', 'weekly'] as const).map((value) => (
            <View key={value} style={{ flexGrow: 1, flexBasis: 80 }}>
              <HabitFormChoice
                title={t(`habits.frequencyOptions.${value}`)}
                label={t(`habits.${value}`)}
                selected={schedule === value}
                disabled={disabled}
                onPress={() => setSchedule(value)}
              />
            </View>
          ))}
        </View>
        {schedule === 'weekdays' && (
          <>
            <HabitFormChoice
              title={t('habits.workweek')}
              icon="calendar"
              selected={mask === 31}
              disabled={disabled}
              onPress={() => setMask(31)}
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginHorizontal: -tokens.spacing.md,
              }}
            >
              {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
                <View
                  key={day}
                  style={{ flexBasis: tokens.minimumTouchTarget }}
                >
                  <HabitFormChoice
                    title={t(`habits.dayInitials.${day}`)}
                    label={t(`habits.days.${day}`)}
                    selected={(mask & (1 << (day - 1))) !== 0}
                    disabled={disabled}
                    onPress={() => setMask((value) => value ^ (1 << (day - 1)))}
                  />
                </View>
              ))}
            </View>
          </>
        )}
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
      </HabitFormCard>

      <HabitFormCard>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <Icon name="target" color={colors.link} />
          <Text accessibilityRole="header" weight="bold">
            {t('habits.dailyGoal')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
          {(['quantity', 'binary'] as const).map((value) => (
            <View key={value} style={{ flex: 1 }}>
              <HabitFormChoice
                title={t(
                  value === 'binary'
                    ? 'habits.binaryOption'
                    : 'habits.quantity',
                )}
                label={t(`habits.${value}`)}
                icon={value === 'quantity' ? 'bar-chart-2' : 'check-circle'}
                selected={mode === value}
                disabled={disabled}
                onPress={() => setMode(value)}
              />
            </View>
          ))}
        </View>
        {mode === 'quantity' ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: tokens.spacing.md,
              }}
            >
              <View style={{ flexGrow: 1, flexBasis: 120 }}>
                <Input
                  label={t('habits.target')}
                  value={target}
                  onChangeText={setTarget}
                  accessibilityHint={t('habits.amountHint')}
                  keyboardType="decimal-pad"
                  editable={!disabled}
                />
              </View>
              <View style={{ flexGrow: 1, flexBasis: 120 }}>
                <Input
                  label={t('habits.unit')}
                  value={unit}
                  onChangeText={setUnit}
                  accessibilityHint={t('habits.unitHint')}
                  placeholder={t('habits.unitPlaceholder')}
                  maxLength={30}
                  editable={!disabled}
                />
              </View>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {t('habits.amountHint')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {t('habits.unitHint')}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {t('habits.binaryDescription')}
          </Text>
        )}
      </HabitFormCard>
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
        }}
      >
        <Icon name="info" size={18} />
        <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>
          {t('habits.startsToday')}
        </Text>
      </View>
      {error && <ErrorMessage message={t(`habits.errors.${error}`)} />}
      {pending && error && <Text>{t('habits.uncertain')}</Text>}
      <Button
        title={t(pending && error ? 'habits.retrySave' : 'habits.create')}
        icon="plus-circle"
        loading={mutation.isPending}
        onPress={() => {
          void save();
        }}
      />
    </Screen>
  );
}
export function CreateHabitScreen() {
  return (
    <BusinessCalendarGate>{() => <CreateHabitForm />}</BusinessCalendarGate>
  );
}
