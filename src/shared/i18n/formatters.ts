export function createLocalizedFormatters(locale: string) {
  return {
    // These are wall-clock fields chosen by the user, not an instant to convert.
    timeOfDay: (hour: number, minute: number) =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(2000, 0, 1, hour, minute))),
    list: (values: string[]) => new Intl.ListFormat(locale).format(values),
    // A business-date label is already assigned to a zone. UTC only transports
    // its calendar fields to Intl; it must not be converted into another date.
    businessDate: (
      value: string,
      options?: Omit<Intl.DateTimeFormatOptions, 'timeZone'>,
    ) =>
      new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
        new Date(value + 'T12:00:00Z'),
      ),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    // Callers choose the business timezone; UI language never defines recurrence dates.
    date: (
      value: Date,
      options: Intl.DateTimeFormatOptions & { timeZone: string },
    ) => new Intl.DateTimeFormat(locale, options).format(value),
  };
}
