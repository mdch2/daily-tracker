import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { Screen, Text, Button, ErrorMessage } from '@/shared/ui/primitives';
import { IconButton } from '@/shared/ui/icon-button';
import { Card } from '@/shared/ui/card';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { goalStates, type GoalState } from '../domain/goal';
import { useGoalPageReset, useGoalRepository } from './goal-context';
import { GoalCard } from './goal-card';

function GoalList({ context }: { context: ReadyBusinessContext }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const format = useLocalizedFormatters();
  const { state } = useAuth();
  const repository = useGoalRepository();
  const [status, setStatus] = useState<GoalState | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const reset = useCallback(
    () => setCursors((value) => (value.length === 1 ? value : [null])),
    [],
  );
  useGoalPageReset(reset, context.today);
  const list = useQuery({
    queryKey: ['goals', state.session?.userId, 'list', status, cursors.at(-1)],
    queryFn: () => repository.list(status, cursors.at(-1) ?? null),
  });
  return (
    <Screen
      bottomSafeArea={false}
      contentStyle={{ padding: 20 }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text
            weight="bold"
            accessibilityRole="header"
            style={{ fontSize: 22, flex: 1 }}
          >
            {t('goals.title')}
          </Text>
          <IconButton
            label={t('goals.create')}
            icon="plus-circle"
            onPress={() => router.push('/goals/new')}
          />
          <IconButton
            label={t('preferences.open')}
            icon="user"
            active
            onPress={() => router.push('/(tabs)/more')}
          />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text weight="bold" style={{ fontSize: 26 }}>
            {t('goals.heading')}
          </Text>
          <Text style={{ color: colors.muted }}>{t('goals.subtitle')}</Text>
        </View>
      </View>
      <Button
        title={t('goals.create')}
        icon="plus"
        onPress={() => router.push('/goals/new')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {([null, ...goalStates] as const).map((value) => (
          <Button
            key={value ?? 'all'}
            title={value ? t(`goals.states.${value}`) : t('goals.all')}
            selected={status === value}
            onPress={() => {
              setStatus(value);
              setCursors([null]);
            }}
          />
        ))}
      </ScrollView>
      {list.isPending && <Text>{t('goals.loading')}</Text>}
      {list.isError && (
        <Card>
          <ErrorMessage
            message={t(`goals.errors.${operationErrorCode(list.error)}`)}
          />
          <Button
            title={t('common.retry')}
            onPress={() => {
              void list.refetch();
            }}
          />
        </Card>
      )}
      {list.isFetching && !list.isPending && <Text>{t('goals.loading')}</Text>}
      {list.isSuccess && !list.isFetching && (
        <>
          <Card>
            <Text weight="bold">{t('goals.summary')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {goalStates.map((value) => (
                <View
                  key={value}
                  style={{
                    minWidth: 90,
                    flexGrow: 1,
                    gap: 4,
                    backgroundColor: colors.elevated,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text weight="bold" style={{ fontSize: 25 }}>
                    {format.number(list.data.counts[value])}
                  </Text>
                  <Text style={{ fontSize: 12 }}>
                    {t(`goals.states.${value}`)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
          {list.data.goals.length === 0 && (
            <Card>
              <Text>{t('goals.empty')}</Text>
            </Card>
          )}
          {list.data.goals.map((goal) => (
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
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {cursors.length > 1 && (
              <Button
                title={t('goals.newer')}
                variant="secondary"
                onPress={() => setCursors((value) => value.slice(0, -1))}
              />
            )}
            {list.data.nextCursor && (
              <Button
                title={t('goals.older')}
                variant="secondary"
                onPress={() =>
                  setCursors((value) => [...value, list.data.nextCursor])
                }
              />
            )}
          </View>
          <Button
            title={t('goals.refresh')}
            variant="secondary"
            loading={list.isFetching}
            onPress={() => {
              reset();
              void list.refetch();
            }}
          />
        </>
      )}
    </Screen>
  );
}
export function GoalsScreen() {
  return (
    <BusinessCalendarGate>
      {(context) => <GoalList context={context} />}
    </BusinessCalendarGate>
  );
}
