import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Text } from '@/shared/ui/primitives';
import { SelectionField } from '@/shared/ui/selection-field';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import type { Schedule } from '../domain/habit';
import { HabitFormCard, HabitFormChoice } from './habit-form-controls';

export function HabitScheduleFields({
  schedule,
  mask,
  weekly,
  disabled,
  onScheduleChange,
  onMaskChange,
  onWeeklyChange,
  allowWeekly = true,
}: {
  schedule: Schedule['scheduleType'];
  mask: number;
  weekly: string;
  disabled: boolean;
  onScheduleChange: (value: Schedule['scheduleType']) => void;
  onMaskChange: (value: number) => void;
  onWeeklyChange: (value: string) => void;
  allowWeekly?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  return (
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
        {(allowWeekly
          ? (['daily', 'weekdays', 'weekly'] as const)
          : (['daily', 'weekdays'] as const)
        ).map((value) => (
          <View key={value} style={{ flexGrow: 1, flexBasis: 80 }}>
            <HabitFormChoice
              title={t(`habits.frequencyOptions.${value}`)}
              label={t(`habits.${value}`)}
              selected={schedule === value}
              disabled={disabled}
              onPress={() => onScheduleChange(value)}
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
            onPress={() => onMaskChange(31)}
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
              <View key={day} style={{ flexBasis: tokens.minimumTouchTarget }}>
                <HabitFormChoice
                  title={t(`habits.dayInitials.${day}`)}
                  label={t(`habits.days.${day}`)}
                  selected={(mask & (1 << (day - 1))) !== 0}
                  disabled={disabled}
                  onPress={() => onMaskChange(mask ^ (1 << (day - 1)))}
                />
              </View>
            ))}
          </View>
        </>
      )}
      {schedule === 'weekly' && (
        <SelectionField
          label={t('habits.weeklyTarget')}
          hint={t('habits.weeklyHint')}
          value={weekly}
          onChange={onWeeklyChange}
          options={[1, 2, 3, 4, 5, 6, 7].map((day) => ({
            value: String(day),
            label: format.number(day),
          }))}
          disabled={disabled}
        />
      )}
    </HabitFormCard>
  );
}
