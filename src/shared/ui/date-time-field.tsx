import { useRef, useState, type ComponentRef } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { useLocalizedFormatters } from '@/shared/i18n/use-localized-formatters';
import { Button } from './primitives';
import { SelectionTrigger } from './selection-field';
import NativePicker from './platform-date-time-picker';
import {
  calendarFields,
  calendarValue,
  clampCalendarValue,
} from './calendar-value';

type FieldProps = {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
};

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  optional = false,
  hint,
  error,
  disabled = false,
}: FieldProps & {
  value: string | null;
  onChange: (date: string | null) => void;
  min?: string;
  max?: string;
  optional?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { colors, mode, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const [draft, setDraft] = useState<string | null>(null);
  const [range, setRange] = useState<{
    min: string | undefined;
    max: string | undefined;
  } | null>(null);
  const trigger = useRef<ComponentRef<typeof View>>(null);
  // Expo's Android date picker transports LOCAL calendar fields; iOS uses explicit UTC.
  const transport = Platform.OS === 'android' ? 'local' : 'utc';
  const outside = !!value && ((!!min && value < min) || (!!max && value > max));
  const unavailable = !!min && !!max && min > max;
  const outdated = range !== null && (range.min !== min || range.max !== max);
  function close() {
    setDraft(null);
    trigger.current?.focus();
  }
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <View ref={trigger} focusable>
        <SelectionTrigger
          label={label}
          value={
            value
              ? format.businessDate(value, { dateStyle: 'medium' })
              : t('fields.noDate')
          }
          hint={hint}
          error={
            error ??
            (outside || outdated ? t('fields.dateOutsideRange') : undefined)
          }
          disabled={disabled || unavailable}
          expanded={draft !== null && !outdated}
          icon="calendar"
          onPress={() => {
            const initial =
              value ?? min ?? max ?? calendarFields(new Date(), 'local');
            setRange({ min, max });
            setDraft(clampCalendarValue(initial, min, max));
          }}
        />
      </View>
      {draft !== null && !disabled && !unavailable && !outdated && (
        <View style={{ gap: tokens.spacing.sm }}>
          <NativePicker
            label={label}
            testID="date-picker"
            mode="date"
            value={calendarValue(draft, transport)}
            {...(min ? { minimumDate: calendarValue(min, transport) } : {})}
            {...(max ? { maximumDate: calendarValue(max, transport) } : {})}
            timeZoneName="UTC"
            locale={i18n.resolvedLanguage ?? 'en'}
            themeVariant={mode}
            accentColor={colors.link}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            positiveButton={{ label: t('fields.confirm') }}
            negativeButton={{ label: t('fields.cancel') }}
            onDismiss={close}
            onValueChange={(_, date) => {
              const next = calendarFields(date, transport);
              if ((min && next < min) || (max && next > max)) return;
              if (Platform.OS === 'android') {
                onChange(next);
                close();
              } else setDraft(next);
            }}
          />
          {Platform.OS !== 'android' && (
            <>
              <Button
                title={t('fields.confirm')}
                onPress={() => {
                  onChange(draft);
                  close();
                }}
              />
              <Button
                title={t('fields.cancel')}
                variant="secondary"
                onPress={close}
              />
            </>
          )}
        </View>
      )}
      {optional && value !== null && (
        <Button
          title={t('fields.removeDate')}
          variant="secondary"
          disabled={disabled}
          onPress={() => {
            onChange(null);
            close();
          }}
        />
      )}
    </View>
  );
}

export function TimeField({
  label,
  hour,
  minute,
  onChange,
  hint,
  disabled = false,
}: FieldProps & {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors, mode, tokens } = useTheme();
  const format = useLocalizedFormatters();
  const [draft, setDraft] = useState<Date | null>(null);
  const trigger = useRef<ComponentRef<typeof View>>(null);
  function close() {
    setDraft(null);
    trigger.current?.focus();
  }
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <View ref={trigger} focusable>
        <SelectionTrigger
          label={label}
          value={format.timeOfDay(hour, minute)}
          hint={hint}
          disabled={disabled}
          expanded={draft !== null}
          icon="clock"
          onPress={() => {
            const date = new Date();
            date.setHours(hour, minute, 0, 0);
            setDraft(date);
          }}
        />
      </View>
      {draft !== null && !disabled && (
        <View style={{ gap: tokens.spacing.sm }}>
          <NativePicker
            label={label}
            testID="time-picker"
            mode="time"
            value={draft}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale={i18n.resolvedLanguage ?? 'en'}
            themeVariant={mode}
            accentColor={colors.link}
            is24Hour
            positiveButton={{ label: t('fields.confirm') }}
            negativeButton={{ label: t('fields.cancel') }}
            onDismiss={close}
            onValueChange={(_, date) => {
              if (Platform.OS === 'android') {
                onChange(date.getHours(), date.getMinutes());
                close();
              } else setDraft(date);
            }}
          />
          {Platform.OS !== 'android' && (
            <>
              <Button
                title={t('fields.confirm')}
                onPress={() => {
                  onChange(draft.getHours(), draft.getMinutes());
                  close();
                }}
              />
              <Button
                title={t('fields.cancel')}
                variant="secondary"
                onPress={close}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
