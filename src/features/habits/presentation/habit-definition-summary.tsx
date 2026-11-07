import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/primitives';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import type { HabitDefinition } from '../domain/habit';

export function HabitDefinitionSummary({
  definition,
}: {
  definition: HabitDefinition;
}) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const frequency =
    definition.scheduleType === 'daily'
      ? t('habits.frequencyOptions.daily')
      : definition.scheduleType === 'weekly'
        ? t('habits.edit.weeklyFrequency', {
            count: definition.weeklyTarget,
            days: format.number(definition.weeklyTarget),
          })
        : ([1, 2, 3, 4, 5, 6, 7] as const)
            .filter((day) => (definition.weekdayMask & (1 << (day - 1))) !== 0)
            .map((day) => t(`habits.days.${day}`))
            .join(', ');
  return (
    <>
      <Text>{frequency}</Text>
      <Text>
        {definition.measurementMode === 'quantity'
          ? t('habits.dailyMinimum', {
              value: format.number(definition.targetMilliunits / 1000, {
                maximumFractionDigits: 3,
              }),
              unit: definition.unitLabel,
            })
          : t('habits.binary')}
      </Text>
    </>
  );
}
