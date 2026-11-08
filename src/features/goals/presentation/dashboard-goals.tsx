import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { useTheme } from '@/shared/theme/use-theme';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { useGoalRepository } from './goal-context';
import { GoalCard } from './goal-card';

export function DashboardGoals({ today }: { today: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state } = useAuth();
  const repository = useGoalRepository();
  const router = useRouter();
  const user = state.session?.userId;
  const query = useQuery({
    queryKey: ['goals', user, 'overview', 'home', today],
    enabled: !!user,
    queryFn: async () => {
      // Ask the owner for filtered pages so archived goals cannot hide active ones.
      // Both reads are bounded; no full-history scan or duplicated progress calculation.
      const [overdue, active] = await Promise.all([
        repository.list('overdue', null),
        repository.list('in_progress', null),
      ]);
      // A goal can move between states while the two server snapshots are read.
      return [
        ...new Map(
          [...overdue.goals, ...active.goals].map((goal) => [
            goal.definition.id,
            goal,
          ]),
        ).values(),
      ].slice(0, 3);
    },
  });
  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" weight="bold" style={{ fontSize: 20 }}>
        {t('goals.homeTitle')}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {t('goals.homeHint')}
      </Text>
      {query.isPending && (
        <Text accessibilityLiveRegion="polite">{t('goals.loading')}</Text>
      )}
      {query.isError && (
        <Card>
          <ErrorMessage
            message={t(`goals.errors.${operationErrorCode(query.error)}`)}
          />
          <Button
            title={t('common.retry')}
            variant="secondary"
            onPress={() => {
              void query.refetch();
            }}
          />
        </Card>
      )}
      {query.isSuccess &&
        (query.data.length ? (
          query.data.map((goal) => (
            <GoalCard
              key={goal.definition.id}
              goal={goal}
              onOpen={() =>
                router.push({
                  pathname: '/goals/[id]',
                  params: { id: goal.definition.id },
                })
              }
            />
          ))
        ) : (
          <Card>
            <Text>{t('goals.homeEmpty')}</Text>
            <Button
              title={t('goals.create')}
              onPress={() => router.push('/goals/new')}
            />
          </Card>
        ))}
      <Button
        title={t('goals.viewAll')}
        variant="secondary"
        onPress={() => router.push('/(tabs)/goals')}
      />
    </View>
  );
}
