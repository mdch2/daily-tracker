import { useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Card } from '@/shared/ui/card';
import { Button, ErrorMessage, Text } from '@/shared/ui/primitives';
import { TimeField } from '@/shared/ui/date-time-field';
import { sameTarget, type ReminderTarget } from '../domain/reminder';
import type { ReminderService } from '../application/reminder-service';
import { useReminderService, useReminderSnapshot } from './reminder-context';

function Control({
  service,
  target,
  disabled,
}: {
  service: ReminderService;
  target: ReminderTarget;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const snapshot = useReminderSnapshot(service);
  const current = snapshot.entries.find((entry) => sameTarget(entry, target));
  const [editing, setEditing] = useState(false);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const blocked = disabled || !snapshot.ready || snapshot.busy;
  async function save() {
    if (saving.current) return;
    setSaved(false);
    if (
      !/^\d{1,2}$/.test(hour) ||
      !/^\d{1,2}$/.test(minute) ||
      Number(hour) > 23 ||
      Number(minute) > 59 ||
      !weekdays.length
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    saving.current = true;
    try {
      await service.save({
        ...target,
        hour: Number(hour),
        minute: Number(minute),
        weekdays,
      });
      setSaved(true);
      setEditing(false);
    } catch {
      /* The service exposes a translated, recoverable error; retain the draft. */
    } finally {
      saving.current = false;
    }
  }
  return (
    <Card>
      <Text accessibilityRole="header" weight="bold">
        {t('reminders.title')}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {t('reminders.explanation')}
      </Text>
      {!snapshot.ready && !snapshot.error && <Text>{t('common.loading')}</Text>}
      <Text>
        {current
          ? t('reminders.enabled', {
              time: format.timeOfDay(current.hour, current.minute),
            })
          : t('reminders.disabled')}
      </Text>
      {current && (
        <Text>
          {format.list(
            current.weekdays.map((day) =>
              t(`habits.days.${day as 1 | 2 | 3 | 4 | 5 | 6 | 7}`),
            ),
          )}
        </Text>
      )}
      {!!snapshot.error && (
        <ErrorMessage message={t(`reminders.errors.${snapshot.error}`)} />
      )}
      {saved && !snapshot.error && (
        <Text accessibilityLiveRegion="polite">{t('reminders.saved')}</Text>
      )}
      {!editing && (
        <Button
          title={t(current ? 'reminders.edit' : 'reminders.enable')}
          variant="secondary"
          disabled={blocked}
          onPress={() => {
            setSaved(false);
            if (current) {
              setHour(String(current.hour).padStart(2, '0'));
              setMinute(String(current.minute).padStart(2, '0'));
              setWeekdays(current.weekdays);
            }
            setEditing(true);
          }}
        />
      )}
      {editing && (
        <>
          <Text style={{ color: colors.muted, fontSize: 14 }}>
            {t('reminders.deviceHint')}
          </Text>
          <TimeField
            label={t('fields.time')}
            hour={Number(hour)}
            minute={Number(minute)}
            disabled={blocked}
            onChange={(nextHour, nextMinute) => {
              setHour(String(nextHour));
              setMinute(String(nextMinute));
            }}
          />
          <Text>{t('reminders.days')}</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: tokens.spacing.sm,
            }}
          >
            {([1, 2, 3, 4, 5, 6, 7] as const).map((day) => (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                aria-checked={weekdays.includes(day)}
                accessibilityLabel={t(`habits.days.${day}`)}
                accessibilityState={{
                  checked: weekdays.includes(day),
                  disabled: blocked,
                }}
                disabled={blocked}
                onPress={() =>
                  setWeekdays((days) =>
                    days.includes(day)
                      ? days.filter((value) => value !== day)
                      : [...days, day].sort(),
                  )
                }
                style={{
                  minHeight: tokens.minimumTouchTarget,
                  minWidth: tokens.minimumTouchTarget,
                  padding: tokens.spacing.sm,
                  borderRadius: tokens.radius.control,
                  borderWidth: 2,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: weekdays.includes(day)
                    ? colors.action
                    : colors.elevated,
                }}
              >
                <Text
                  style={{
                    color: weekdays.includes(day)
                      ? colors.onAction
                      : colors.text,
                  }}
                >
                  {t(`habits.dayInitials.${day}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          {invalid && <ErrorMessage message={t('reminders.errors.invalid')} />}
          <Button
            title={t('reminders.save')}
            disabled={blocked}
            loading={snapshot.busy}
            onPress={() => {
              void save();
            }}
          />
          <Button
            title={t('reminders.cancel')}
            variant="secondary"
            disabled={snapshot.busy}
            onPress={() => {
              setEditing(false);
              setInvalid(false);
            }}
          />
        </>
      )}
      {current && (
        <Button
          title={t('reminders.disable')}
          variant="secondary"
          disabled={blocked}
          onPress={() => {
            setSaved(false);
            void service
              .remove(target)
              .then(() => {
                setSaved(true);
                setEditing(false);
              })
              .catch(() => undefined);
          }}
        />
      )}
      {snapshot.error && <ReminderRecovery service={service} />}
    </Card>
  );
}
export function ReminderControl({
  target,
  disabled = false,
}: {
  target: ReminderTarget;
  disabled?: boolean;
}) {
  const service = useReminderService();
  return service ? (
    <Control
      key={target.kind + target.targetId}
      service={service}
      target={target}
      disabled={disabled}
    />
  ) : null;
}
function ReminderRecovery({ service }: { service: ReminderService }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const snapshot = useReminderSnapshot(service);
  const [settingsError, setSettingsError] = useState(false);
  return (
    <>
      <Button
        title={t('common.retry')}
        disabled={snapshot.busy}
        variant="secondary"
        onPress={() => {
          void service
            .activate(state.session?.userId ?? null)
            .catch(() => undefined);
        }}
      />
      {snapshot.error === 'permission' && (
        <Button
          title={t('reminders.settings')}
          variant="secondary"
          onPress={() => {
            void Linking.openSettings().catch(() => setSettingsError(true));
          }}
        />
      )}
      {settingsError && (
        <ErrorMessage message={t('reminders.errors.unavailable')} />
      )}
    </>
  );
}
function Status({ service }: { service: ReminderService }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const snapshot = useReminderSnapshot(service);
  return (
    <Card>
      <Text accessibilityRole="header" weight="bold">
        {t('reminders.title')}
      </Text>
      <Text>{t('reminders.manage')}</Text>
      <Text>{t('reminders.count', { count: snapshot.entries.length })}</Text>
      {!!snapshot.error && (
        <ErrorMessage message={t(`reminders.errors.${snapshot.error}`)} />
      )}
      {snapshot.error && <ReminderRecovery service={service} />}
      <Button
        title={t('reminders.reset')}
        variant="secondary"
        disabled={snapshot.busy}
        onPress={() => {
          void service
            .reset()
            .then(() => service.activate(state.session?.userId ?? null))
            .catch(() => undefined);
        }}
      />
    </Card>
  );
}
export function ReminderStatus() {
  const service = useReminderService();
  return service ? <Status service={service} /> : null;
}
