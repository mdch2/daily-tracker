import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Text } from '@/shared/ui/primitives';
import type { Habit, HabitDayRecord } from '../domain/habit';
import { addBusinessDays, dayStatus } from '../domain/habit-rules';
import { useHabitDayColors } from './habit-heatmap';
import type { habitDetailPeriod } from './habit-detail-period';

export function HabitPeriodMap({
  habit,
  records,
  today,
  range,
}: {
  habit: Habit;
  records: HabitDayRecord[];
  today: string;
  range: ReturnType<typeof habitDetailPeriod>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useLocalizedFormatters();
  const dayColors = useHabitDayColors();
  const byDate = new Map(
    records
      .filter((row) => row.habitId === habit.id)
      .map((row) => [row.date, row]),
  );
  const [width, setWidth] = useState(300);
  const gap = range.weeks > 20 ? 1 : 3;
  const size = Math.max(
    3,
    Math.min(24, Math.floor((width - 24) / range.weeks) - gap),
  );
  const height = Math.max(12, size);
  const weeks = Array.from({ length: range.weeks }, (_, index) =>
    Array.from({ length: 7 }, (_, day) =>
      addBusinessDays(range.mapStart, index * 7 + day),
    ),
  );
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('habits.detail.mapDescription', {
        name: habit.name,
        from: format.businessDate(range.start),
        to: format.businessDate(range.end),
      })}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            width: 24 + range.weeks * (size + gap),
            gap: 8,
            paddingVertical: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginLeft: 24,
            }}
          >
            {[
              ...new Set([
                0,
                Math.floor((range.weeks - 1) / 2),
                range.weeks - 1,
              ]),
            ].map((index) => (
              <Text key={index} style={{ fontSize: 10, color: colors.muted }}>
                {format.businessDate(
                  [range.start, addBusinessDays(range.mapStart, index * 7)]
                    .sort()
                    .at(-1)!,
                  { month: 'short' },
                )}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap }}>
            <View style={{ width: 24 - gap, gap }}>
              {weeks[0]?.map((date) => (
                <Text
                  key={date}
                  style={{
                    fontSize: 9,
                    lineHeight: height,
                    height,
                    color: colors.muted,
                  }}
                >
                  {format.businessDate(date, { weekday: 'narrow' })}
                </Text>
              ))}
            </View>
            {weeks.map((week) => (
              <View key={week[0]} style={{ gap }}>
                {week.map((date) => (
                  <View
                    key={date}
                    style={{
                      width: size,
                      height,
                      borderRadius: 2,
                      borderWidth: 1,
                      opacity: date < range.start || date > range.end ? 0.3 : 1,
                      ...dayColors(
                        dayStatus(habit, date, today, byDate.get(date)),
                      ),
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
