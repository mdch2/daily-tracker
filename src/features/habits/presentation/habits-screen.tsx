import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { RouteLink } from '@/shared/ui/route-link';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { useHabitRepository } from './habit-context';
import { HabitSummary } from './habit-summary';

function HabitList({ context }: { context: ReadyBusinessContext }) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const { state } = useAuth();
  const format = useLocalizedFormatters();
  const repository = useHabitRepository();
  const [page, setPage] = useState(0);
  const user = state.session?.userId;
  const list = useQuery({
    queryKey: ['habits', user, 'list', page],
    queryFn: () => repository.list(page * 30),
  });
  const ids = list.data?.habits.map((habit) => habit.id) ?? [];
  const days = useQuery({
    queryKey: [
      'habits',
      user,
      'days',
      ids,
      context.weekStartDate,
      context.today,
    ],
    queryFn: () =>
      repository.readDays(ids, context.weekStartDate, context.today),
    enabled: list.isSuccess,
  });
  const failure = list.error ?? days.error;
  return (
    <Screen>
      <Text
        accessibilityRole="header"
        style={{ fontSize: tokens.typography.title }}
      >
        {t('habits.title')}
      </Text>
      <Text>
        {t('habits.accountToday', { date: format.businessDate(context.today) })}
      </Text>
      <Text>
        {t('calendar.context', {
          zone: context.timeZone,
          day: t(
            context.weekStartDay === 1 ? 'calendar.monday' : 'calendar.sunday',
          ),
        })}
      </Text>
      <RouteLink href="/habits/new">{t('habits.create')}</RouteLink>
      {failure ? (
        <>
          <ErrorMessage
            message={t(`habits.errors.${operationErrorCode(failure)}`)}
          />
          <Button
            title={t('common.retry')}
            onPress={() => {
              void list.refetch();
              void days.refetch();
            }}
          />
        </>
      ) : list.isPending || days.isPending ? (
        <Text>{t('habits.loading')}</Text>
      ) : (
        <>
          {!list.data?.habits.length && <Text>{t('habits.empty')}</Text>}
          {list.data?.habits.map((habit) => (
            <View
              key={habit.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: tokens.radius.card,
                padding: tokens.spacing.md,
                gap: tokens.spacing.sm,
              }}
            >
              <Text accessibilityRole="header" weight="bold">
                {habit.name}
              </Text>
              <HabitSummary
                habit={habit}
                records={days.data ?? []}
                date={context.today}
                today={context.today}
              />
              <RouteLink
                href={{ pathname: '/habits/[id]', params: { id: habit.id } }}
              >
                {t('habits.open', { name: habit.name })}
              </RouteLink>
            </View>
          ))}
          <Button
            title={t('habits.previous')}
            variant="secondary"
            disabled={page === 0}
            onPress={() => setPage((value) => value - 1)}
          />
          <Button
            title={t('habits.next')}
            variant="secondary"
            disabled={!list.data?.hasMore}
            onPress={() => setPage((value) => value + 1)}
          />
        </>
      )}
    </Screen>
  );
}
export function HabitsScreen() {
  return (
    <BusinessCalendarGate>
      {(context) => <HabitList context={context} />}
    </BusinessCalendarGate>
  );
}
