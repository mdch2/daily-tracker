import { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { RouteLink } from '@/shared/ui/route-link';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import type { Habit } from '../domain/habit';
import { addBusinessDays, dayStatus, weekStart } from '../domain/habit-rules';
import { useHabitRepository } from './habit-context';
import { HabitSummary } from './habit-summary';
import { HabitDayEditor } from './habit-day-editor';

function HabitHistory({
  habit,
  context,
}: {
  habit: Habit;
  context: ReadyBusinessContext;
}) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const repository = useHabitRepository();
  const client = useQueryClient();
  const format = useLocalizedFormatters();
  const user = state.session?.userId;
  const [page, setPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(context.today);
  const [locked, setLocked] = useState(false);
  const end = addBusinessDays(context.today, -page * 14);
  const start = [habit.startDate, addBusinessDays(end, -13)].sort().at(-1)!;
  // Include complete historical week boundaries, even across a page boundary.
  const from = weekStart(start, habit.definition.weekStartDay);
  const to = [
    context.today,
    addBusinessDays(weekStart(end, habit.definition.weekStartDay), 6),
  ].sort()[0]!;
  const days = useQuery({
    queryKey: ['habits', user, 'history', habit.id, from, to],
    queryFn: () => repository.readDays([habit.id], from, to),
    placeholderData: keepPreviousData,
  });
  const { refetch } = days;
  const refresh = useCallback(async () => {
    await client.invalidateQueries({
      queryKey: ['habits', user],
      refetchType: 'none',
    });
    await client.invalidateQueries({ queryKey: ['business-context', user] });
    const result = await refetch({ throwOnError: true });
    return result.data ?? [];
  }, [client, user, refetch]);
  const dates: string[] = [];
  for (let date = end; date >= start; date = addBusinessDays(date, -1))
    dates.push(date);
  const rows = days.data ?? [];
  return (
    <Screen>
      <Text accessibilityRole="header">{habit.name}</Text>
      <Text>
        {t('calendar.context', {
          zone: habit.definition.timeZone,
          day: t(
            habit.definition.weekStartDay === 1
              ? 'calendar.monday'
              : 'calendar.sunday',
          ),
        })}
      </Text>
      <Text>{t(`habits.${habit.definition.scheduleType}`)}</Text>
      <Text>
        {t('habits.selectedDate', {
          date: format.businessDate(selectedDate, { dateStyle: 'full' }),
        })}
      </Text>
      {days.isPending ? (
        <Text>{t('habits.loading')}</Text>
      ) : (
        <>
          {days.isError && (
            <ErrorMessage
              message={t(`habits.errors.${operationErrorCode(days.error)}`)}
            />
          )}
          {days.data && (
            <>
              <HabitSummary
                habit={habit}
                date={selectedDate}
                today={context.today}
                records={rows}
              />
              <HabitDayEditor
                key={habit.id + selectedDate}
                habit={habit}
                date={selectedDate}
                today={context.today}
                record={rows.find((row) => row.date === selectedDate)}
                refresh={refresh}
                onLock={setLocked}
                dataCurrent={!days.isError && !days.isPlaceholderData}
              />
            </>
          )}
          {!days.data && (
            <Button
              title={t('common.retry')}
              onPress={() => {
                void days.refetch();
              }}
            />
          )}
          <Text accessibilityRole="header">{t('habits.history')}</Text>
          {dates.map((date) => (
            <Button
              key={date}
              title={t('habits.dateStatus', {
                date: format.businessDate(date, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
                status: t(
                  `habits.status.${dayStatus(
                    habit,
                    date,
                    context.today,
                    rows.find((row) => row.date === date),
                  )}`,
                ),
              })}
              variant="secondary"
              selected={selectedDate === date}
              disabled={locked || !days.data}
              onPress={() => setSelectedDate(date)}
            />
          ))}
          <Button
            title={t('habits.older')}
            variant="secondary"
            disabled={locked || start <= habit.startDate}
            onPress={() => {
              setPage((value) => value + 1);
              setSelectedDate(addBusinessDays(end, -14));
            }}
          />
          <Button
            title={t('habits.recent')}
            variant="secondary"
            disabled={locked || page === 0}
            onPress={() => {
              setPage((value) => value - 1);
              setSelectedDate(addBusinessDays(end, 14));
            }}
          />
        </>
      )}
      <RouteLink href="/(tabs)/habits" disabled={locked}>
        {t('habits.back')}
      </RouteLink>
    </Screen>
  );
}
function HabitDetail({
  id,
  context,
}: {
  id: string;
  context: ReadyBusinessContext;
}) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const repository = useHabitRepository();
  const query = useQuery({
    queryKey: ['habits', state.session?.userId, 'detail', id],
    queryFn: () => repository.findById(id),
  });
  if (query.isPending)
    return (
      <Screen>
        <Text>{t('habits.loading')}</Text>
      </Screen>
    );
  if (query.isError || !query.data)
    return (
      <Screen>
        <ErrorMessage
          message={t(
            `habits.errors.${query.isError ? operationErrorCode(query.error) : 'notFound'}`,
          )}
        />
        <Button
          title={t('common.retry')}
          onPress={() => {
            void query.refetch();
          }}
        />
        <RouteLink href="/(tabs)/habits">{t('habits.back')}</RouteLink>
      </Screen>
    );
  return <HabitHistory habit={query.data} context={context} />;
}
export function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <BusinessCalendarGate>
      {(context) => <HabitDetail id={id} context={context} />}
    </BusinessCalendarGate>
  );
}
