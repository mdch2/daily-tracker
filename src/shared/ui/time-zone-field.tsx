import { useMemo } from 'react';
import { getCalendars } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import timeZones from '@/shared/i18n/time-zones.json';
import { SelectionField } from './selection-field';

export function TimeZoneField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (zone: string) => void;
  disabled: boolean;
  error?: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const deviceZone = getCalendars()[0]?.timeZone ?? null;
  const options = useMemo(() => {
    const zones = [
      ...new Set([
        ...(deviceZone ? [deviceZone] : []),
        ...timeZones,
        ...(value ? [value] : []),
      ]),
    ];
    return zones.flatMap((zone) => {
      try {
        const offset = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
          timeZone: zone,
          timeZoneName: 'longOffset',
        })
          .formatToParts(new Date())
          .find((part) => part.type === 'timeZoneName')?.value;
        return [
          {
            value: zone,
            label: zone.replaceAll('_', ' '),
            description: `${offset ?? ''}${zone === deviceZone ? ` · ${t('fields.suggestedZone')}` : ''}`,
          },
        ];
      } catch {
        return [];
      }
    });
  }, [deviceZone, value, i18n.resolvedLanguage, t]);
  return (
    <SelectionField
      label={t('fields.timeZone')}
      value={value || null}
      options={options}
      onChange={onChange}
      disabled={disabled}
      hint={t('fields.zoneHint')}
      error={error}
      searchable
    />
  );
}
