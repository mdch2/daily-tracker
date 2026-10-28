import { Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Text } from '@/shared/ui/primitives';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import type { Habit, HabitDayRecord } from '../domain/habit';
import { canRecord, dayStatus, habitAtDate } from '../domain/habit-rules';

export function HabitDayRow({
  habit: source,
  date,
  today,
  record,
  onInspect,
  onRecord,
}: {
  habit: Habit;
  date: string;
  today: string;
  record: HabitDayRecord | undefined;
  onInspect: () => void;
  onRecord: () => void;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.2;
  const habit = habitAtDate(source, date);
  const status = dayStatus(habit, date, today, record);
  const completed = status === 'completed';
  const quantity =
    habit.definition.measurementMode === 'quantity' ? habit.definition : null;
  return (
    <Card
      style={{
        padding: 12,
        borderRadius: tokens.radius.control,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('habits.open', { name: habit.name })}
        onPress={onInspect}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: tokens.minimumTouchTarget,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        {!compact && (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: completed ? colors.accentSoft : colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={quantity ? 'bar-chart-2' : 'check-square'}
              color={completed ? colors.link : colors.text}
              size={22}
            />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="bold" style={{ fontSize: 16 }}>
            {habit.name}
          </Text>
          <Text
            style={{
              color: completed ? colors.link : colors.muted,
              fontSize: 12,
            }}
          >
            {t(`habits.status.${status}`)}
          </Text>
          {quantity && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {record
                ? t('habits.amount', {
                    amount: format.number(
                      (record?.amountMilliunits ?? 0) / 1000,
                      {
                        maximumFractionDigits: 3,
                      },
                    ),
                    target: format.number(quantity.targetMilliunits / 1000, {
                      maximumFractionDigits: 3,
                    }),
                    unit: quantity.unitLabel,
                  })
                : t('habits.dailyMinimum', {
                    value: format.number(quantity.targetMilliunits / 1000, {
                      maximumFractionDigits: 3,
                    }),
                    unit: quantity.unitLabel,
                  })}
            </Text>
          )}
          {habit.definition.scheduleType === 'weekly' && (
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {t('habits.edit.weeklyFrequency', {
                count: habit.definition.weeklyTarget,
                days: format.number(habit.definition.weeklyTarget),
              })}
            </Text>
          )}
        </View>
      </Pressable>
      {compact || completed || date !== today ? (
        <IconButton
          label={t('dashboard.recordHabit', {
            name: habit.name,
            date: format.businessDate(date),
          })}
          icon={completed ? 'check' : 'plus'}
          active={completed}
          disabled={!canRecord(habit, date, today)}
          onPress={onRecord}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.recordHabit', {
            name: habit.name,
            date: format.businessDate(date),
          })}
          onPress={onRecord}
          style={({ pressed }) => ({
            minHeight: tokens.minimumTouchTarget,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: pressed ? colors.selection : colors.elevated,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          })}
        >
          <Icon
            name={quantity ? 'plus' : 'circle'}
            size={18}
            color={colors.text}
          />
          <Text weight="semibold" style={{ fontSize: 13 }}>
            {t('dashboard.record')}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}
