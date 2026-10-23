import type { PropsWithChildren } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Text } from '@/shared/ui/primitives';
import { Icon, type IconName } from '@/shared/ui/icon';
import type { Habit, HabitDayRecord } from '../domain/habit';
import {
  canRecord,
  dayStatus,
  weeklyProgress,
  weekStart,
} from '../domain/habit-rules';

export function HabitIconButton({
  label,
  icon,
  onPress,
  disabled = false,
  active = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: tokens.minimumTouchTarget,
        minHeight: tokens.minimumTouchTarget,
        padding: tokens.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: tokens.radius.control,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        backgroundColor: active ? colors.action : colors.elevated,
      })}
    >
      <Icon name={icon} color={active ? colors.onAction : colors.text} />
    </Pressable>
  );
}

export function HabitListCard({
  habit,
  record,
  records,
  today,
  dataCurrent,
  onInspect,
  onRecord,
  children,
}: PropsWithChildren<{
  habit: Habit;
  record: HabitDayRecord | undefined;
  records: HabitDayRecord[];
  today: string;
  dataCurrent: boolean;
  onInspect: () => void;
  onRecord: () => void;
}>) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const status = dayStatus(habit, today, today, record);
  const week =
    habit.definition.scheduleType === 'weekly'
      ? weeklyProgress(
          habit,
          records.filter((row) => row.habitId === habit.id),
          weekStart(today, habit.definition.weekStartDay),
          today,
        )
      : null;
  const quantity =
    habit.definition.measurementMode === 'quantity' ? habit.definition : null;
  const goal = quantity
    ? t('habits.dailyMinimum', {
        value: format.number(quantity.targetMilliunits / 1000, {
          maximumFractionDigits: 3,
        }),
        unit: quantity.unitLabel,
      })
    : t('habits.binary');
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: tokens.radius.card,
        padding: tokens.spacing.md,
        gap: tokens.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: tokens.spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('habits.inspect', { name: habit.name })}
          onPress={onInspect}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: tokens.minimumTouchTarget,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: tokens.spacing.sm,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View
            style={{
              padding: 10,
              borderRadius: tokens.radius.control,
              backgroundColor: colors.elevated,
            }}
          >
            <Icon
              name={quantity ? 'bar-chart-2' : 'check-square'}
              size={22}
              color={colors.link}
            />
          </View>
          <View style={{ flex: 1, gap: tokens.spacing.xs }}>
            <Text accessibilityRole="header" weight="bold">
              {habit.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{goal}</Text>
            <Text
              style={{
                color:
                  status === 'completed' && dataCurrent
                    ? colors.success
                    : colors.muted,
                fontSize: 12,
              }}
            >
              {dataCurrent
                ? t('habits.todayStatus', {
                    status: t(`habits.status.${status}`),
                  })
                : t('habits.currentUnavailable')}
            </Text>
            {quantity && record && dataCurrent && (
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {t('habits.recordedAmount', {
                  value: format.number((record.amountMilliunits ?? 0) / 1000, {
                    maximumFractionDigits: 3,
                  }),
                  unit: quantity.unitLabel,
                })}
              </Text>
            )}
            {week && dataCurrent && (
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {t('habits.compactWeekProgress', {
                  days: format.number(week.days),
                  target: format.number(week.target),
                })}
              </Text>
            )}
            {week?.status === 'partialWeek' && dataCurrent && (
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {t('habits.partialWeek')}
              </Text>
            )}
          </View>
        </Pressable>
        <HabitIconButton
          label={t('habits.recordToday', { name: habit.name })}
          icon={status === 'completed' ? 'check' : quantity ? 'plus' : 'circle'}
          active={dataCurrent && status === 'completed'}
          disabled={!dataCurrent || !canRecord(habit, today, today)}
          onPress={onRecord}
        />
      </View>
      {children}
    </View>
  );
}
