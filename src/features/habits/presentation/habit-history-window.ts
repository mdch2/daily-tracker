import { addBusinessDays, weekStart } from '../domain/habit-rules';

export function habitHistoryWindow(
  today: string,
  firstDay: 1 | 7,
  page: number,
) {
  const end = addBusinessDays(weekStart(today, firstDay), 6 - page * 112);
  return {
    start: addBusinessDays(end, -111),
    end,
    readTo: end < today ? end : today,
  };
}
