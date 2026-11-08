import { createElement } from 'react';
import type { DateTimePickerProps } from '@expo/ui/community/datetime-picker';
import { calendarFields, calendarValue } from './calendar-value';

export type { DateTimePickerProps };

// Browser preview only; native builds use the system calendar/clock.
export default function PlatformDateTimePicker(
  props: DateTimePickerProps & { label: string },
) {
  const isDate = props.mode === 'date';
  return createElement('input', {
    type: isDate ? 'date' : 'time',
    'data-testid': props.testID,
    'aria-label': props.label,
    value: isDate
      ? calendarFields(props.value)
      : `${String(props.value.getHours()).padStart(2, '0')}:${String(props.value.getMinutes()).padStart(2, '0')}`,
    min: props.minimumDate ? calendarFields(props.minimumDate) : undefined,
    max: props.maximumDate ? calendarFields(props.maximumDate) : undefined,
    disabled: props.disabled,
    style: {
      colorScheme: props.themeVariant,
      minHeight: 48,
      width: '100%',
      fontSize: 18,
    },
    onChange: (event: { target: { value: string } }) => {
      if (!event.target.value) return;
      const date = isDate
        ? calendarValue(event.target.value)
        : new Date(props.value);
      if (!isDate) {
        const [hour, minute] = event.target.value.split(':').map(Number);
        date.setHours(hour!, minute!, 0, 0);
      }
      props.onValueChange?.(
        { nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } },
        date,
      );
    },
  });
}
