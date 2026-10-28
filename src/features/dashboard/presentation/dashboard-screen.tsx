import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import { useProfileRepository } from '@/features/profile/presentation/profile-context';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import type { Habit } from '@/features/habits/domain/habit';
import { readHabitOverview } from '@/features/habits/application/read-habit-overview';
import { dailyHabitOverview } from '@/features/habits/domain/habit-overview';
import { useHabitRepository } from '@/features/habits/presentation/habit-context';
import { HabitDayRow } from '@/features/habits/presentation/habit-day-row';
import { HabitRecordSheet } from '@/features/habits/presentation/habit-record-sheet';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { DailySummaryCard } from './daily-summary-card';
import { DashboardWeek } from './dashboard-week';

function DashboardContent({ context }: { context: ReadyBusinessContext }) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const { state } = useAuth();
  const profiles = useProfileRepository();
  const repository = useHabitRepository();
  const router = useRouter();
  const format = useLocalizedFormatters();
  const [selection, setSelection] = useState<{
    date: string;
    week: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [inspection, setInspection] = useState<{
    habit: Habit;
    date: string;
  } | null>(null);
  const user = state.session?.userId;
  const profile = useQuery({
    queryKey: ['profile', user],
    queryFn: () => profiles.findByUserId(user!),
    enabled: !!user,
  });
  const overview = useQuery({
    queryKey: [
      'habits',
      user,
      'overview',
      'home',
      context.weekStartDate,
      context.today,
    ],
    queryFn: () =>
      readHabitOverview(repository, context.weekStartDate, context.today),
    enabled: !!user,
  });
  const date =
    selection?.week === context.weekStartDate ? selection.date : context.today;
  const habits = overview.data?.habits ?? [];
  const records = overview.data?.records ?? [];
  const daily = dailyHabitOverview(habits, records, date);
  const visible = daily.eligible.filter((habit) =>
    habit.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <Screen
        bottomSafeArea={false}
        contentStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 28,
          gap: 16,
        }}
        header={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.muted }}>
                {format.businessDate(context.today, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Text weight="bold" style={{ fontSize: 22 }}>
                {t('navigation.home')}
              </Text>
            </View>
            <IconButton
              label={t(
                searching ? 'dashboard.closeSearch' : 'dashboard.search',
              )}
              icon={searching ? 'x' : 'search'}
              onPress={() => {
                setSearching((value) => !value);
                setSearch('');
              }}
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
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text
              accessibilityRole="header"
              weight="bold"
              style={{ fontSize: 24, flexGrow: 1 }}
            >
              {profile.data?.displayName
                ? t('dashboard.greeting', { name: profile.data.displayName })
                : t('dashboard.welcome')}
            </Text>
            <View
              style={{
                backgroundColor: colors.accentSoft,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.link }}>
                {t(
                  mode === 'light'
                    ? 'dashboard.lightMode'
                    : 'dashboard.darkMode',
                )}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {t('dashboard.tagline')}
          </Text>
          {profile.isError && (
            <>
              <ErrorMessage message={t('errors.profile')} />
              <Button
                title={t('dashboard.retryProfile')}
                variant="secondary"
                onPress={() => {
                  void profile.refetch();
                }}
              />
            </>
          )}
        </View>
        <DashboardWeek
          start={context.weekStartDate}
          today={context.today}
          selected={date}
          onSelect={(next) =>
            setSelection({ date: next, week: context.weekStartDate })
          }
        />
        {searching && (
          <Input
            label={t('dashboard.search')}
            icon="search"
            value={search}
            onChangeText={setSearch}
            autoFocus
            autoCorrect={false}
          />
        )}
        {overview.isPending && (
          <Card>
            <ActivityIndicator color={colors.link} />
            <Text accessibilityLiveRegion="polite">{t('habits.loading')}</Text>
          </Card>
        )}
        {overview.isError && (
          <Card>
            <ErrorMessage
              message={t(`habits.errors.${operationErrorCode(overview.error)}`)}
            />
            <Button
              title={t('common.retry')}
              variant="secondary"
              onPress={() => {
                void overview.refetch();
              }}
            />
          </Card>
        )}
        {overview.isSuccess && (
          <>
            <DailySummaryCard
              completed={daily.completed}
              scheduled={daily.scheduled}
              future={date > context.today}
              isToday={date === context.today}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 4,
              }}
            >
              <Text
                accessibilityRole="header"
                weight="bold"
                style={{ fontSize: 20 }}
              >
                {t(
                  date === context.today
                    ? 'dashboard.todayHabits'
                    : 'dashboard.dayHabits',
                )}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {t('dashboard.available', {
                  count: daily.eligible.length,
                  value: format.number(daily.eligible.length),
                })}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {t('habits.accountDate', {
                zone: context.timeZone,
                date: format.businessDate(date, {
                  day: 'numeric',
                  month: 'short',
                }),
              })}
            </Text>
            {!habits.length ? (
              <Card>
                <Icon name="check-circle" size={32} color={colors.link} />
                <Text weight="bold">{t('dashboard.emptyTitle')}</Text>
                <Text style={{ color: colors.muted }}>{t('habits.empty')}</Text>
                <Button
                  title={t('habits.create')}
                  icon="plus"
                  onPress={() => router.push('/habits/new')}
                />
              </Card>
            ) : !daily.eligible.length ? (
              <Card>
                <Text style={{ color: colors.muted }}>
                  {t('dashboard.noDayHabits')}
                </Text>
                <Button
                  title={t('dashboard.viewHabits')}
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/habits')}
                />
              </Card>
            ) : !visible.length ? (
              <Text style={{ color: colors.muted }}>
                {t('dashboard.noSearchResults')}
              </Text>
            ) : (
              visible.map((habit) => (
                <HabitDayRow
                  key={habit.id}
                  habit={habit}
                  date={date}
                  today={context.today}
                  record={records.find(
                    (record) =>
                      record.habitId === habit.id && record.date === date,
                  )}
                  onInspect={() =>
                    router.push({
                      pathname: '/habits/[id]',
                      params: { id: habit.id, date },
                    })
                  }
                  onRecord={() => setInspection({ habit, date })}
                />
              ))
            )}
            {habits.length > 0 && (
              <Card style={{ marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      backgroundColor: colors.accentSoft,
                    }}
                  >
                    <Icon name="activity" color={colors.link} />
                  </View>
                  <Text
                    accessibilityRole="header"
                    weight="bold"
                    style={{ fontSize: 18, flex: 1 }}
                  >
                    {t('dashboard.weeklyRhythm')}
                  </Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  {t('dashboard.weeklyHint')}
                </Text>
                <Button
                  title={t('dashboard.viewHabits')}
                  variant="secondary"
                  icon="arrow-right"
                  onPress={() => router.push('/(tabs)/habits')}
                />
              </Card>
            )}
          </>
        )}
      </Screen>
      {inspection && (
        <HabitRecordSheet
          habit={inspection.habit}
          initialDate={inspection.date}
          from={inspection.date}
          to={inspection.date}
          today={context.today}
          onClose={() => setInspection(null)}
        />
      )}
    </>
  );
}

export function DashboardScreen() {
  return (
    <BusinessCalendarGate>
      {(context) => <DashboardContent context={context} />}
    </BusinessCalendarGate>
  );
}
