import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { operationErrorCode } from '@/shared/domain/operation-error';
import type { Habit } from '../domain/habit';
import { addBusinessDays, weekStart } from '../domain/habit-rules';
import { readHabitWindow } from '../application/read-habit-window';
import { useHabitRepository } from './habit-context';
import { HabitDayEditor } from './habit-day-editor';
import { HabitSummary } from './habit-summary';
import { HabitIconButton } from './habit-list-card';

export function HabitRecordSheet({
  habit,
  initialDate,
  from,
  to,
  today,
  onClose,
}: {
  habit: Habit;
  initialDate: string;
  from: string;
  to: string;
  today: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useLocalizedFormatters();
  const repository = useHabitRepository();
  const client = useQueryClient();
  const { state } = useAuth();
  const user = state.session?.userId;
  const readFrom = weekStart(from, habit.definition.weekStartDay);
  const weekEnd = addBusinessDays(
    weekStart(to, habit.definition.weekStartDay),
    6,
  );
  // Keep the inspected week range stable across midnight. Future labels have
  // no records; the server clock still controls status and write eligibility.
  const readTo = weekEnd;
  const days = useQuery({
    queryKey: ['habits', user, 'inspection', habit.id, readFrom, readTo],
    queryFn: () => readHabitWindow(repository, [habit.id], readFrom, readTo),
  });
  const { refetch } = days;
  const refresh = useCallback(async () => {
    await client.invalidateQueries({
      queryKey: ['habits', user],
      refetchType: 'none',
    });
    const result = await refetch({ throwOnError: true });
    await client.invalidateQueries({ queryKey: ['business-context', user] });
    await client.refetchQueries({
      queryKey: ['habits', user, 'overview'],
      type: 'active',
    });
    return result.data ?? [];
  }, [client, user, refetch]);
  const records = days.data ?? [];
  const dataCurrent = days.isSuccess;
  const [date, setDate] = useState(initialDate);
  const [locked, setLocked] = useState(false);
  const headingRef = useRef<ComponentRef<typeof View>>(null);
  const close = () => {
    if (!locked) onClose();
  };
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(habit.name);
  }, [habit.name]);
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
      onShow={() => {
        if (Platform.OS === 'web') headingRef.current?.focus();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.scrim,
          paddingTop: insets.top + tokens.spacing.md,
        }}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          style={{
            maxHeight: '92%',
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            padding: tokens.spacing.lg,
            paddingBottom: Math.max(insets.bottom, tokens.spacing.lg),
            backgroundColor: colors.surface,
            borderTopLeftRadius: tokens.radius.card,
            borderTopRightRadius: tokens.radius.card,
            gap: tokens.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: tokens.spacing.sm,
              alignItems: 'center',
            }}
          >
            <View ref={headingRef} focusable style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                weight="bold"
                style={{ fontSize: 20 }}
              >
                {habit.name}
              </Text>
            </View>
            <HabitIconButton
              label={t('common.close')}
              icon="x"
              disabled={locked}
              onPress={close}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: tokens.spacing.md }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.spacing.sm,
              }}
            >
              {from !== to && (
                <HabitIconButton
                  label={t('habits.previousDay')}
                  icon="chevron-left"
                  disabled={locked || date <= from}
                  onPress={() => setDate((value) => addBusinessDays(value, -1))}
                />
              )}
              <Text
                accessibilityLiveRegion="polite"
                style={{ flex: 1, textAlign: 'center' }}
              >
                {format.businessDate(date, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
              {from !== to && (
                <HabitIconButton
                  label={t('habits.nextDay')}
                  icon="chevron-right"
                  disabled={locked || date >= to}
                  onPress={() => setDate((value) => addBusinessDays(value, 1))}
                />
              )}
            </View>
            {days.isPending && <Text>{t('habits.loading')}</Text>}
            {days.isError && (
              <ErrorMessage
                message={t(`habits.errors.${operationErrorCode(days.error)}`)}
              />
            )}
            {dataCurrent && (
              <HabitSummary
                habit={habit}
                date={date}
                today={today}
                records={records}
              />
            )}
            {days.data && (
              <HabitDayEditor
                key={habit.id + date}
                habit={habit}
                date={date}
                today={today}
                record={records.find(
                  (row) => row.habitId === habit.id && row.date === date,
                )}
                refresh={refresh}
                onLock={setLocked}
                dataCurrent={dataCurrent}
              />
            )}
            {days.isError && !days.data && (
              <Button
                title={t('common.retry')}
                onPress={() => {
                  void days.refetch();
                }}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
