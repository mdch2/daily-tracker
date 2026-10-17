export function createLocalizedFormatters(locale: string) {
  return {
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    // Callers choose the business timezone; UI language never defines recurrence dates.
    date: (
      value: Date,
      options: Intl.DateTimeFormatOptions & { timeZone: string },
    ) => new Intl.DateTimeFormat(locale, options).format(value),
  };
}
