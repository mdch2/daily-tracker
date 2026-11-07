export type WeekStartDay = 1 | 7;
export type BusinessContext = {
  serverTime: string;
} & (
  | { configured: false }
  | {
      configured: true;
      today: string;
      timeZone: string;
      weekStartDay: WeekStartDay;
      weekStartDate: string;
      nextDayAt: string;
    }
);
export type ReadyBusinessContext = Extract<
  BusinessContext,
  { configured: true }
>;

export type InitialHabitCalendar = {
  timeZone: string;
  weekStartDay: WeekStartDay;
};
