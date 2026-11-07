import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { useRoutineRepository } from './routine-context';
import { readRoutineOverview } from '../application/read-routine-overview';
import { RoutineCard } from './routine-card';

export function DashboardRoutines({
  date,
  today,
}: {
  date: string;
  today: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { state } = useAuth();
  const repository = useRoutineRepository();
  const habits = useHabitRepository();
  const query = useQuery({
    queryKey: ['routines', state.session?.userId, 'overview', date, today],
    queryFn: () => readRoutineOverview(repository, habits, date, today),
  });
  return (
    <>
      <Text accessibilityRole="header" weight="bold" style={{ fontSize: 20 }}>
        {t('routines.todaySection')}
      </Text>
      {query.isPending && <Text>{t('routines.loading')}</Text>}
      {query.isError && (
        <Card>
          <ErrorMessage
            message={t(`routines.errors.${operationErrorCode(query.error)}`)}
          />
          <Button
            title={t('common.retry')}
            onPress={() => {
              void query.refetch();
            }}
          />
        </Card>
      )}
      {query.isSuccess &&
        (!query.data.routines.length ? (
          <Card>
            <Text>{t('routines.noDayRoutines')}</Text>
          </Card>
        ) : (
          query.data.routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              date={date}
              today={today}
              window={query.data.window}
              onOpen={() =>
                router.push({
                  pathname: '/routines/[id]',
                  params: { id: routine.id, date },
                })
              }
            />
          ))
        ))}
      <Button
        title={t('routines.viewAll')}
        variant="secondary"
        onPress={() => router.push('/(tabs)/routines')}
      />
    </>
  );
}
