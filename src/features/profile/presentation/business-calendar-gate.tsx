import { useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { operationErrorCode } from '@/shared/domain/operation-error';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import type {
  ReadyBusinessContext,
  WeekStartDay,
} from '../domain/business-calendar';
import { createCalendarActions } from '../application/calendar-actions';
import { useProfileRepository } from './profile-context';
import { useBusinessContext } from './use-business-context';

function CalendarSetup({ reload }: { reload: () => void }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const repository = useProfileRepository();
  const client = useQueryClient();
  const [timeZone, setTimeZone] = useState('');
  const [firstDay, setFirstDay] = useState<WeekStartDay | null>(null);
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: createCalendarActions(repository).initialize,
  });
  return (
    <Screen>
      <Text accessibilityRole="header">{t('calendar.title')}</Text>
      <Text>{t('calendar.description')}</Text>
      <Input
        label={t('calendar.timeZone')}
        hint={t('calendar.zoneHint')}
        value={timeZone}
        onChangeText={setTimeZone}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!mutation.isPending}
      />
      <Text>{t('calendar.weekStart')}</Text>
      {([1, 7] as const).map((day) => (
        <Button
          key={day}
          title={t(day === 1 ? 'calendar.monday' : 'calendar.sunday')}
          selected={firstDay === day}
          disabled={mutation.isPending}
          onPress={() => setFirstDay(day)}
        />
      ))}
      {mutation.isError && (
        <ErrorMessage
          message={t(`habits.errors.${operationErrorCode(mutation.error)}`)}
        />
      )}
      <Button
        title={t('calendar.confirm')}
        loading={mutation.isPending}
        onPress={() => {
          if (submitting.current) return;
          submitting.current = true;
          void mutation
            .mutateAsync({ timeZone, weekStartDay: firstDay })
            .then(async () => {
              await client.invalidateQueries({
                queryKey: ['profile', state.session?.userId],
              });
              reload();
            })
            .catch(() => undefined)
            .finally(() => {
              submitting.current = false;
            });
        }}
      />
      {mutation.isError && (
        <Button
          title={t('habits.reload')}
          variant="secondary"
          onPress={reload}
        />
      )}
      <PreferencesControls />
    </Screen>
  );
}

export function BusinessCalendarGate({
  children,
}: {
  children: (context: ReadyBusinessContext) => ReactNode;
}) {
  const { t } = useTranslation();
  const query = useBusinessContext();
  const reload = () => {
    void query.refetch();
  };
  if (query.isPending)
    return (
      <Screen>
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  if (query.isError && !query.data)
    return (
      <Screen>
        <ErrorMessage
          message={t(`habits.errors.${operationErrorCode(query.error)}`)}
        />
        <Button title={t('common.retry')} onPress={reload} />
        <PreferencesControls />
      </Screen>
    );
  if (!query.data) return null;
  if (!query.data.configured) return <CalendarSetup reload={reload} />;
  return (
    <View style={{ flex: 1 }}>
      {query.isError && (
        <View>
          <ErrorMessage
            message={t(`habits.errors.${operationErrorCode(query.error)}`)}
          />
          <Button title={t('common.retry')} onPress={reload} />
        </View>
      )}
      {children(query.data)}
    </View>
  );
}
