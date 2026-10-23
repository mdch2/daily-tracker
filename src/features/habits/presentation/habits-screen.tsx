import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { Icon, type IconName } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import type { Habit } from '../domain/habit';
import { readHabitWindow } from '../application/read-habit-window';
import { useHabitRepository } from './habit-context';
import { habitHistoryWindow } from './habit-history-window';
import { HabitHeatmap, HabitMapLegend } from './habit-heatmap';
import { HabitIconButton, HabitListCard } from './habit-list-card';
import { HabitRecordSheet } from './habit-record-sheet';

function ViewChoice({
  title,
  selected,
  onPress,
  icon,
  tab = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  tab?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={tab ? 'tab' : 'button'}
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-selected={tab ? selected : undefined}
      aria-pressed={tab ? undefined : selected}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: tokens.minimumTouchTarget,
        paddingHorizontal: 12,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.pill,
        backgroundColor: selected ? colors.action : colors.elevated,
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon && (
        <Icon
          name={icon}
          size={16}
          color={selected ? colors.onAction : colors.muted}
        />
      )}
      <Text
        weight="semibold"
        style={{
          fontSize: 13,
          flexShrink: 1,
          textAlign: 'center',
          color: selected ? colors.onAction : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

type Inspection = {
  habit: Habit;
  initialDate: string;
  from: string;
  to: string;
};

function HabitList({ context }: { context: ReadyBusinessContext }) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const { state } = useAuth();
  const router = useRouter();
  const format = useLocalizedFormatters();
  const repository = useHabitRepository();
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'daily' | 'history'>('daily');
  const [filter, setFilter] = useState<'all' | 'binary' | 'quantity'>('all');
  const [historyPage, setHistoryPage] = useState(0);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const user = state.session?.userId;
  const list = useQuery({
    queryKey: ['habits', user, 'list', page],
    queryFn: () => repository.list(page * 30),
  });
  const habits = list.data?.habits ?? [];
  const ids = habits.map((habit) => habit.id);
  const days = useQuery({
    queryKey: [
      'habits',
      user,
      'overview',
      'daily',
      ids,
      context.weekStartDate,
      context.today,
    ],
    queryFn: () =>
      repository.readDays(ids, context.weekStartDate, context.today),
    enabled: list.isSuccess && ids.length > 0,
  });
  const window = habitHistoryWindow(
    context.today,
    context.weekStartDay,
    historyPage,
  );
  const history = useQuery({
    queryKey: [
      'habits',
      user,
      'overview',
      'history',
      ids,
      window.start,
      window.readTo,
    ],
    queryFn: () =>
      readHabitWindow(repository, ids, window.start, window.readTo),
    enabled: list.isSuccess && ids.length > 0 && view === 'history',
  });
  const failure =
    list.error ?? days.error ?? (view === 'history' ? history.error : null);
  const visible = habits.filter(
    (habit) => filter === 'all' || habit.definition.measurementMode === filter,
  );
  const current = list.isSuccess && days.isSuccess;
  const inspect = (habit: Habit) => {
    const range =
      view === 'history'
        ? window
        : habitHistoryWindow(context.today, context.weekStartDay, 0);
    setInspection({
      habit,
      initialDate: range.readTo,
      from: range.start,
      to: range.readTo,
    });
  };
  return (
    <>
      <Screen
        contentStyle={{ padding: tokens.spacing.md, gap: tokens.spacing.md }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <View
            style={{
              padding: tokens.spacing.sm,
              borderRadius: tokens.radius.control,
              backgroundColor: colors.accentSoft,
            }}
          >
            <Icon name="clock" color={colors.link} />
          </View>
          <Text
            accessibilityRole="header"
            weight="bold"
            style={{ flex: 1, fontSize: 20 }}
          >
            {t('habits.title')}
          </Text>
          <HabitIconButton
            label={t('preferences.open')}
            icon="user"
            onPress={() => router.push('/(tabs)/more')}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: tokens.spacing.xs }}>
            <Text weight="bold" style={{ fontSize: 22 }}>
              {t('habits.myHabits')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {list.data
                ? t(
                    page > 0 || list.data?.hasMore
                      ? 'habits.pageHabitCount'
                      : 'habits.trackedCount',
                    {
                      value: format.number(habits.length),
                      count: habits.length,
                    },
                  )
                : t(
                    list.isPending
                      ? 'habits.loading'
                      : 'habits.currentUnavailable',
                  )}
            </Text>
          </View>
          <Button
            title={t('habits.new')}
            icon="plus"
            onPress={() => router.push('/habits/new')}
          />
        </View>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            backgroundColor: colors.elevated,
            padding: tokens.spacing.xs,
            borderRadius: tokens.radius.pill,
            gap: tokens.spacing.xs,
          }}
        >
          {(['daily', 'history'] as const).map((value) => (
            <View key={value} style={{ flex: 1 }}>
              <ViewChoice
                title={t(`habits.views.${value}`)}
                icon={value === 'daily' ? 'list' : 'grid'}
                selected={view === value}
                tab
                onPress={() => setView(value)}
              />
            </View>
          ))}
        </View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.spacing.sm,
          }}
        >
          {(['all', 'binary', 'quantity'] as const).map((value) => (
            <ViewChoice
              key={value}
              title={t(
                value === 'all'
                  ? 'habits.all'
                  : value === 'binary'
                    ? 'habits.binaryOption'
                    : 'habits.quantity',
              )}
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </View>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {t('habits.accountDate', {
            zone: context.timeZone,
            date: format.businessDate(context.today, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          })}
        </Text>
        {view === 'history' && (
          <>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t('habits.mapRange', {
                from: format.businessDate(window.start),
                to: format.businessDate(window.end),
              })}
            </Text>
            <HabitMapLegend />
          </>
        )}
        {failure && (
          <>
            <ErrorMessage
              message={t(`habits.errors.${operationErrorCode(failure)}`)}
            />
            <Button
              title={t('common.retry')}
              variant="secondary"
              onPress={() => {
                void list.refetch();
                if (ids.length) {
                  void days.refetch();
                  if (view === 'history') void history.refetch();
                }
              }}
            />
          </>
        )}
        {(list.isPending || (ids.length > 0 && days.isPending)) && (
          <Text accessibilityLiveRegion="polite">{t('habits.loading')}</Text>
        )}
        {list.isSuccess && !habits.length && (
          <View
            style={{
              padding: tokens.spacing.lg,
              gap: tokens.spacing.md,
              alignItems: 'center',
              borderRadius: tokens.radius.card,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="check-square" size={32} color={colors.link} />
            <Text style={{ textAlign: 'center', color: colors.muted }}>
              {t('habits.empty')}
            </Text>
          </View>
        )}
        {list.isSuccess && habits.length > 0 && !visible.length && (
          <Text>{t('habits.filterEmpty')}</Text>
        )}
        {visible.map((habit) => (
          <HabitListCard
            key={habit.id}
            habit={habit}
            today={context.today}
            record={days.data?.find(
              (row) => row.habitId === habit.id && row.date === context.today,
            )}
            dataCurrent={current}
            records={days.data ?? []}
            onInspect={() => inspect(habit)}
            onRecord={() =>
              setInspection({
                habit,
                initialDate: context.today,
                from: context.today,
                to: context.today,
              })
            }
          >
            {view === 'history' &&
              (history.isSuccess ? (
                <HabitHeatmap
                  habit={habit}
                  records={history.data}
                  start={window.start}
                  today={context.today}
                />
              ) : (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {t(
                    history.isPending
                      ? 'habits.loading'
                      : 'habits.mapUnavailable',
                  )}
                </Text>
              ))}
          </HabitListCard>
        ))}
        {view === 'history' && habits.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('habits.older')}
                  variant="secondary"
                  disabled={habits.every(
                    (habit) => habit.startDate >= window.start,
                  )}
                  onPress={() => setHistoryPage((value) => value + 1)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('habits.recent')}
                  variant="secondary"
                  disabled={historyPage === 0}
                  onPress={() => setHistoryPage((value) => value - 1)}
                />
              </View>
            </View>
          </>
        )}
        {habits.length > 0 && (
          <Text
            style={{ textAlign: 'center', color: colors.muted, fontSize: 12 }}
          >
            {t('habits.inspectHint')}
          </Text>
        )}
        {(page > 0 || list.data?.hasMore) && (
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title={t('habits.previous')}
                variant="secondary"
                disabled={page === 0}
                onPress={() => {
                  setPage((value) => value - 1);
                  setHistoryPage(0);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('habits.next')}
                variant="secondary"
                disabled={!list.data?.hasMore}
                onPress={() => {
                  setPage((value) => value + 1);
                  setHistoryPage(0);
                }}
              />
            </View>
          </View>
        )}
      </Screen>
      {inspection && (
        <HabitRecordSheet
          {...inspection}
          today={context.today}
          onClose={() => setInspection(null)}
        />
      )}
    </>
  );
}
export function HabitsScreen() {
  return (
    <BusinessCalendarGate>
      {(context) => <HabitList context={context} />}
    </BusinessCalendarGate>
  );
}
