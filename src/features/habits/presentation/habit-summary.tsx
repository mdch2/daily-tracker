import { useTranslation } from 'react-i18next';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Text } from '@/shared/ui/primitives';
import type { Habit, HabitDayRecord } from '../domain/habit';
import {
  addBusinessDays,
  dayStatus,
  weeklyProgress,
  weekStart,
  habitAtDate,
} from '../domain/habit-rules';

export function HabitValue({
  habit: sourceHabit,
  record,
}: {
  habit: Habit;
  record?: HabitDayRecord | undefined;
}) {
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  if (!record) return <Text>{t('habits.noRecord')}</Text>;
  const habit = habitAtDate(sourceHabit, record.date);
  if (habit.definition.measurementMode === 'binary')
    return (
      <Text>
        {t(
          record.binaryValue
            ? 'habits.status.completed'
            : 'habits.explicitFalse',
        )}
      </Text>
    );
  return (
    <Text>
      {t('habits.amount', {
        amount: format.number((record.amountMilliunits ?? 0) / 1000, {
          maximumFractionDigits: 3,
        }),
        target: format.number(habit.definition.targetMilliunits / 1000, {
          maximumFractionDigits: 3,
        }),
        unit: habit.definition.unitLabel,
      })}
    </Text>
  );
}
export function HabitSummary({
  habit: sourceHabit,
  records,
  date,
  today,
}: {
  habit: Habit;
  records: HabitDayRecord[];
  date: string;
  today: string;
}) {
  const habit = habitAtDate(sourceHabit, date);
  const { t } = useTranslation();
  const format = useLocalizedFormatters();
  const record = records.find(
    (value) => value.habitId === habit.id && value.date === date,
  );
  const weekly =
    habit.definition.scheduleType === 'weekly'
      ? weeklyProgress(
          habit,
          records.filter((value) => value.habitId === habit.id),
          weekStart(date, habit.definition.weekStartDay),
          today,
        )
      : null;
  return (
    <>
      <Text>{t(`habits.status.${dayStatus(habit, date, today, record)}`)}</Text>
      {!(
        habit.definition.measurementMode === 'binary' && record?.binaryValue
      ) && <HabitValue habit={habit} record={record} />}
      {weekly && (
        <>
          <Text>
            {t('habits.weekProgress', {
              days: format.number(weekly.days),
              target: format.number(weekly.target),
              start: format.businessDate(weekly.start),
              end: format.businessDate(addBusinessDays(weekly.end, -1)),
            })}
          </Text>
          {weekly.status === 'partialWeek' ? (
            <Text>{t('habits.partialWeek')}</Text>
          ) : (
            <Text>
              {t('habits.weekStatus', {
                status: t(`habits.status.${weekly.status}`),
              })}
            </Text>
          )}
        </>
      )}
    </>
  );
}
