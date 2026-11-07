import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import { Screen, Text, Button, ErrorMessage } from '@/shared/ui/primitives';
import { IconButton } from '@/shared/ui/icon-button';
import { Card } from '@/shared/ui/card';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { readRoutineWindow } from '../application/read-routine-window';
import { useRoutineRepository } from './routine-context';
import { RoutineCard } from './routine-card';

function RoutineList({ context }: { context: ReadyBusinessContext }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useAuth();
  const format = useLocalizedFormatters();
  const repository = useRoutineRepository();
  const habits = useHabitRepository();
  const user = state.session?.userId;
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ['routines', user, 'list', page, archived],
    queryFn: () => repository.list(page * 20, archived),
  });
  const routines = list.data?.routines ?? [];
  const window = useQuery({
    queryKey: ['routines', user, 'window', routines, context.today],
    queryFn: () =>
      readRoutineWindow(
        repository,
        habits,
        routines,
        context.today,
        context.today,
      ),
    enabled: list.isSuccess,
  });
  const failure = list.error ?? window.error;
  return (
    <Screen
      bottomSafeArea={false}
      contentStyle={{ padding: 20 }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            accessibilityRole="header"
            weight="bold"
            style={{ fontSize: 22, flex: 1 }}
          >
            {t('routines.title')}
          </Text>
          <IconButton
            label={t('routines.create')}
            icon="plus-circle"
            onPress={() => router.push('/routines/new')}
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
      <View style={{ gap: 4 }}>
        <Text weight="bold" style={{ fontSize: 24 }}>
          {t('routines.heading')}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>
          {t('routines.description')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([false, true] as const).map((value) => (
          <View key={String(value)} style={{ flex: 1 }}>
            <Button
              title={t(value ? 'routines.archived' : 'routines.active')}
              selected={archived === value}
              onPress={() => {
                setArchived(value);
                setPage(0);
              }}
            />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {t('habits.accountDate', {
          zone: context.timeZone,
          date: format.businessDate(context.today, {
            day: 'numeric',
            month: 'short',
          }),
        })}
      </Text>
      {(list.isPending || (list.isSuccess && window.isPending)) && (
        <Text>{t('routines.loading')}</Text>
      )}
      {failure && (
        <Card>
          <ErrorMessage
            message={t(`routines.errors.${operationErrorCode(failure)}`)}
          />
          <Button
            title={t('common.retry')}
            onPress={() => {
              void list.refetch();
              void window.refetch();
            }}
          />
        </Card>
      )}
      {list.isSuccess && window.isSuccess && !failure && (
        <>
          {routines.length === 0 ? (
            <Card>
              <Text weight="bold">
                {t(archived ? 'routines.emptyArchived' : 'routines.empty')}
              </Text>
              {!archived && (
                <Button
                  title={t('routines.create')}
                  icon="plus"
                  onPress={() => router.push('/routines/new')}
                />
              )}
            </Card>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {t('routines.pageCount', {
                  count: routines.length,
                  value: format.number(routines.length),
                })}
              </Text>
              {routines.map((routine, index) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  date={context.today}
                  today={context.today}
                  window={window.data}
                  expanded={index === 0 && !archived}
                  onOpen={() =>
                    router.push({
                      pathname: '/routines/[id]',
                      params: { id: routine.id },
                    })
                  }
                />
              ))}
            </>
          )}
        </>
      )}
      {(page > 0 || list.data?.hasMore) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t('habits.previous')}
              disabled={page === 0}
              variant="secondary"
              onPress={() => setPage((value) => value - 1)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t('habits.next')}
              disabled={!list.data?.hasMore}
              variant="secondary"
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
export function RoutinesScreen() {
  return (
    <BusinessCalendarGate>
      {(context) => <RoutineList context={context} />}
    </BusinessCalendarGate>
  );
}
