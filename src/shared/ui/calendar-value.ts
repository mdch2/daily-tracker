// UTC is only a transport for date-only fields, never the account's business zone.
export function calendarValue(
  value: string,
  transport: 'utc' | 'local' = 'utc',
): Date {
  if (transport === 'utc') return new Date(`${value}T12:00:00.000Z`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(year!, month! - 1, day!);
  return date;
}

export function calendarFields(
  value: Date,
  transport: 'utc' | 'local' = 'utc',
): string {
  if (transport === 'utc') return value.toISOString().slice(0, 10);
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function clampCalendarValue(
  value: string,
  min?: string,
  max?: string,
): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}
