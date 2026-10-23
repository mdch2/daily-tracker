import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import type { ReadyBusinessContext } from '@/features/profile/domain/business-calendar';
import { Button, ErrorMessage, Screen, Text } from '@/shared/ui/primitives';
import { RouteLink } from '@/shared/ui/route-link';
import { Icon } from '@/shared/ui/icon';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { operationErrorCode } from '@/shared/domain/operation-error';
import type { Habit } from '../domain/habit';
import { addBusinessDays, canRecord, dayStatus } from '../domain/habit-rules';
import { readHabitWindow } from '../application/read-habit-window';
import { useHabitRepository } from './habit-context';
import { HabitSummary, HabitValue } from './habit-summary';
import { HabitIconButton } from './habit-list-card';
import { HabitRecordSheet } from './habit-record-sheet';
import { HabitMapLegend } from './habit-heatmap';
import { HabitPeriodMap } from './habit-period-map';
import { habitDetailPeriod, type HabitPeriod } from './habit-detail-period';

function HabitHistory({
  habit,
  context,
  initialDate,
}: {
  habit: Habit;
  context: ReadyBusinessContext;
  initialDate: string;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const { state } = useAuth();
  const router = useRouter();
  const format = useLocalizedFormatters();
  const repository = useHabitRepository();
  const [anchor] = useState(initialDate);
  const [period, setPeriod] = useState<HabitPeriod>('year');
  const [page, setPage] = useState(0);
  const [date, setDate] = useState(initialDate);
  const [expanded, setExpanded] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [inspection, setInspection] = useState<{
    initialDate: string;
    from: string;
    to: string;
  } | null>(null);
  const range = habitDetailPeriod(
    anchor,
    habit.definition.weekStartDay,
    period,
    page,
  );
  const from = [range.start, habit.startDate].sort().at(-1)!;
  const to = [range.end, context.today].sort()[0]!;
  const days = useQuery({
    queryKey: [
      'habits',
      state.session?.userId,
      'overview',
      'detail-period',
      habit.id,
      range.mapStart,
      range.mapEnd,
    ],
    queryFn: () =>
      readHabitWindow(repository, [habit.id], range.mapStart, range.mapEnd),
  });
  const records = days.data ?? [];
  const current = days.isSuccess;
  const quantity =
    habit.definition.measurementMode === 'quantity' ? habit.definition : null;
  const goal = quantity
    ? t('habits.dailyMinimum', {
        value: format.number(quantity.targetMilliunits / 1000, {
          maximumFractionDigits: 3,
        }),
        unit: quantity.unitLabel,
      })
    : t('habits.binary');
  const card = {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  };
  const inspect = (value: string) =>
    setInspection({ initialDate: value, from, to });
  const changePeriod = (value: HabitPeriod, nextPage = 0) => {
    const next = habitDetailPeriod(
      anchor,
      habit.definition.weekStartDay,
      value,
      nextPage,
    );
    setPeriod(value);
    setPage(nextPage);
    setHistoryPage(0);
    setDate([anchor, next.end].sort()[0]!);
  };
  const recent = records
    .filter(
      (row) => row.habitId === habit.id && row.date >= from && row.date <= to,
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((row) => row.date);
  const historyEnd = addBusinessDays(to, -historyPage * 14);
  const dates = expanded
    ? Array.from({ length: 14 }, (_, index) =>
        addBusinessDays(historyEnd, -index),
      ).filter((value) => value >= from)
    : recent;
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
          <HabitIconButton
            label={t('habits.back')}
            icon="arrow-left"
            onPress={() => router.replace('/(tabs)/habits')}
          />
          <Text
            accessibilityRole="header"
            weight="bold"
            style={{ flex: 1, fontSize: 18, textAlign: 'center' }}
          >
            {t('habits.detail.title')}
          </Text>
          <HabitIconButton
            label={t('preferences.open')}
            icon="user"
            onPress={() => router.push('/(tabs)/more')}
          />
        </View>
        <View style={{ ...card, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: colors.accentSoft,
              padding: 16,
              borderRadius: tokens.radius.control,
            }}
          >
            <Icon
              name={quantity ? 'bar-chart-2' : 'check-square'}
              size={28}
              color={colors.link}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              accessibilityRole="header"
              weight="bold"
              style={{ fontSize: 22 }}
            >
              {habit.name}
            </Text>
            <Text style={{ color: colors.link, fontSize: 12 }}>
              {t('habits.detail.active')}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{goal}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {t(`habits.frequencyOptions.${habit.definition.scheduleType}`)}
            </Text>
          </View>
        </View>
        <View
          accessibilityRole="tablist"
          accessibilityLabel={t('habits.detail.period')}
          style={{
            flexDirection: 'row',
            backgroundColor: colors.elevated,
            borderRadius: tokens.radius.pill,
            padding: 4,
          }}
        >
          {(['week', 'month', 'quarter', 'year'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityLabel={t(`habits.detail.periods.${value}`)}
              accessibilityState={{ selected: period === value }}
              aria-selected={period === value}
              onPress={() => changePeriod(value)}
              style={{
                flex: 1,
                minHeight: tokens.minimumTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  period === value ? colors.action : colors.elevated,
                borderRadius: tokens.radius.pill,
                padding: 4,
              }}
            >
              <Text
                weight="semibold"
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  color: period === value ? colors.onAction : colors.text,
                }}
              >
                {t(`habits.detail.periods.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={card}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="grid" size={18} color={colors.link} />
            <Text accessibilityRole="header" weight="bold" style={{ flex: 1 }}>
              {t('habits.detail.map')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <HabitIconButton
              label={t('habits.detail.previousPeriod')}
              icon="chevron-left"
              disabled={range.start <= habit.startDate}
              onPress={() => changePeriod(period, page + 1)}
            />
            <Text
              accessibilityLiveRegion="polite"
              style={{
                flex: 1,
                fontSize: 12,
                textAlign: 'center',
                color: colors.muted,
              }}
            >
              {t('habits.detail.range', {
                from: format.businessDate(range.start),
                to: format.businessDate(range.end),
              })}
            </Text>
            <HabitIconButton
              label={t('habits.detail.nextPeriod')}
              icon="chevron-right"
              disabled={page === 0}
              onPress={() => changePeriod(period, page - 1)}
            />
          </View>
          {days.isPending && <Text>{t('habits.loading')}</Text>}
          {days.isError && (
            <>
              <ErrorMessage
                message={t(`habits.errors.${operationErrorCode(days.error)}`)}
              />
              <Button
                title={t('common.retry')}
                variant="secondary"
                onPress={() => {
                  void days.refetch();
                }}
              />
            </>
          )}
          {current && (
            <>
              <HabitPeriodMap
                habit={habit}
                records={records}
                today={context.today}
                range={range}
              />
              <HabitMapLegend />
            </>
          )}
        </View>
        {current && (
          <>
            <View style={card}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <HabitIconButton
                  label={t('habits.previousDay')}
                  icon="chevron-left"
                  disabled={date <= from}
                  onPress={() => setDate((value) => addBusinessDays(value, -1))}
                />
                <Text
                  weight="semibold"
                  style={{ flex: 1, textAlign: 'center', fontSize: 13 }}
                >
                  {format.businessDate(date, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <HabitIconButton
                  label={t('habits.nextDay')}
                  icon="chevron-right"
                  disabled={date >= to}
                  onPress={() => setDate((value) => addBusinessDays(value, 1))}
                />
              </View>
              <HabitSummary
                habit={habit}
                date={date}
                today={context.today}
                records={records}
              />
              <Button
                title={t('habits.detail.inspectRecord')}
                variant="secondary"
                icon="edit-2"
                onPress={() => inspect(date)}
              />
            </View>
            <View style={{ gap: tokens.spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                }}
              >
                <Text
                  accessibilityRole="header"
                  weight="bold"
                  style={{ flex: 1, fontSize: 18 }}
                >
                  {t('habits.detail.recentHistory')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setExpanded((value) => !value);
                    setHistoryPage(0);
                  }}
                  style={{
                    minHeight: tokens.minimumTouchTarget,
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                  }}
                >
                  <Text style={{ color: colors.link, fontSize: 13 }}>
                    {t(
                      expanded
                        ? 'habits.detail.showRecent'
                        : 'habits.detail.showAll',
                    )}
                  </Text>
                </Pressable>
              </View>
              {!dates.length && (
                <Text style={{ color: colors.muted }}>
                  {t('habits.detail.empty')}
                </Text>
              )}
              {dates.map((value) => {
                const record = records.find(
                  (row) => row.habitId === habit.id && row.date === value,
                );
                const status = dayStatus(habit, value, context.today, record);
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={t('habits.dateStatus', {
                      date: format.businessDate(value, { dateStyle: 'full' }),
                      status: t(`habits.status.${status}`),
                    })}
                    onPress={() => inspect(value)}
                    style={{
                      ...card,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      minHeight: tokens.minimumTouchTarget,
                    }}
                  >
                    <Icon
                      name={status === 'completed' ? 'check-circle' : 'circle'}
                      color={
                        status === 'completed' ? colors.link : colors.muted
                      }
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text weight="semibold" style={{ fontSize: 13 }}>
                        {format.businessDate(value, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <HabitValue habit={habit} record={record} />
                      {record && (
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {t('habits.detail.updated', {
                            value: format.date(new Date(record.updatedAt), {
                              timeZone: habit.definition.timeZone,
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }),
                          })}
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.muted} />
                  </Pressable>
                );
              })}
              {expanded && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t('habits.older')}
                      variant="secondary"
                      disabled={addBusinessDays(historyEnd, -13) <= from}
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
              )}
            </View>
          </>
        )}
        <Button
          title={t('habits.recordToday', { name: habit.name })}
          icon="plus"
          disabled={!canRecord(habit, context.today, context.today)}
          onPress={() =>
            setInspection({
              initialDate: context.today,
              from: context.today,
              to: context.today,
            })
          }
        />
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {t('calendar.context', {
            zone: habit.definition.timeZone,
            day: t(
              habit.definition.weekStartDay === 1
                ? 'calendar.monday'
                : 'calendar.sunday',
            ),
          })}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {t('habits.detail.fixedConfiguration')}
        </Text>
      </Screen>
      {inspection && (
        <HabitRecordSheet
          habit={habit}
          {...inspection}
          today={context.today}
          onClose={() => setInspection(null)}
        />
      )}
    </>
  );
}

function HabitDetail({
  id,
  initialDate,
  context,
}: {
  id: string;
  initialDate: string;
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
  return (
    <HabitHistory
      key={id}
      habit={query.data}
      context={context}
      initialDate={
        initialDate < query.data.startDate ? query.data.startDate : initialDate
      }
    />
  );
}

export function HabitDetailScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const { t } = useTranslation();
  return (
    <BusinessCalendarGate>
      {(context) => {
        if (
          date !== undefined &&
          (!z.iso.date().safeParse(date).success || date > context.today)
        )
          return (
            <Screen>
              <ErrorMessage message={t('habits.errors.invalidInput')} />
              <RouteLink href="/(tabs)/habits">{t('habits.back')}</RouteLink>
            </Screen>
          );
        return (
          <HabitDetail
            key={id + (date ?? '')}
            id={id}
            initialDate={date ?? context.today}
            context={context}
          />
        );
      }}
    </BusinessCalendarGate>
  );
}
