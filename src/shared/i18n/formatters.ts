export function createLocalizedFormatters(locale: string) {
  return {
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
