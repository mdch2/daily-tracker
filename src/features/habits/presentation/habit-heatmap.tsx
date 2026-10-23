import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Text } from '@/shared/ui/primitives';
import type { Habit, HabitDayRecord } from '../domain/habit';
import {
  addBusinessDays,
  dayStatus,
  type DayStatus,
} from '../domain/habit-rules';

export function useHabitDayColors() {
  const { colors } = useTheme();
  return (status: DayStatus) => ({
    backgroundColor:
      status === 'completed'
        ? colors.action
        : status === 'partial'
          ? colors.selection
          : status === 'missed'
            ? colors.errorSurface
            : status === 'pending' || status === 'unrecorded'
              ? colors.elevated
              : colors.background,
    borderColor:
      status === 'completed'
        ? colors.link
        : status === 'partial'
          ? colors.link
          : status === 'missed'
            ? colors.error
            : status === 'future'
              ? colors.fieldBorder
              : colors.border,
    borderStyle:
      status === 'future' ||
      status === 'notScheduled' ||
      status === 'notStarted'
        ? ('dashed' as const)
        : ('solid' as const),
  });
}

export function HabitHeatmap({
  habit,
  records,
  start,
  today,
}: {
  habit: Habit;
  records: HabitDayRecord[];
  start: string;
  today: string;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const dayColors = useHabitDayColors();
  const byDate = new Map(
    records
      .filter((row) => row.habitId === habit.id)
      .map((row) => [row.date, row]),
  );
  const weeks = Array.from({ length: 16 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) =>
      addBusinessDays(start, week * 7 + day),
    ),
  );
  return (
    <View
      accessibilityRole="image"
      accessible
      accessibilityLabel={t('habits.mapDescription', {
        name: habit.name,
        from: format.businessDate(start),
        to: format.businessDate(addBusinessDays(start, 111)),
      })}
      style={{
        backgroundColor: colors.field,
        borderRadius: tokens.radius.control,
        padding: 12,
        gap: tokens.spacing.sm,
      }}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        {[0, 5, 10, 15].map((week) => (
          <Text key={week} style={{ fontSize: 11, color: colors.muted }}>
            {format.businessDate(addBusinessDays(start, week * 7), {
              month: 'short',
            })}
          </Text>
        ))}
      </View>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ flexDirection: 'row', gap: 3 }}
      >
        {weeks.map((week) => (
          <View key={week[0]} style={{ flex: 1, gap: 3 }}>
            {week.map((date) => (
              <View
                key={date}
                style={{
                  aspectRatio: 1,
                  borderRadius: 2,
                  borderWidth: 1,
                  ...dayColors(dayStatus(habit, date, today, byDate.get(date))),
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function HabitMapLegend() {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const dayColors = useHabitDayColors();
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}
    >
      {(
        [
          'completed',
          'partial',
          'pending',
          'missed',
          'notScheduled',
          'future',
        ] as const
      ).map((status) => (
        <View
          key={status}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.xs,
          }}
        >
          <View
            accessible={false}
            style={{
              width: 10,
              height: 10,
              borderWidth: 1,
              borderRadius: 2,
              ...dayColors(status),
            }}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {t(`habits.legend.${status}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}
