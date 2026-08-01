import { addDays, endOfMonth, format, isSameDay, startOfDay, startOfMonth } from 'date-fns';

/**
 * Labels are kept local on purpose: importing `date-fns/locale` pulls in every
 * locale of the package and breaks Metro's web bundle.
 */
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Nightlife days do not end at midnight. A party starting at 02:00 on Sunday
 * still belongs to Saturday night, so every "day" runs from 06:00 to 06:00.
 */
export const NIGHT_START_HOUR = 6;

export interface DayOption {
  /** yyyy-MM-dd of the calendar day the night starts on. */
  key: string;
  date: Date;
  /** "Today", "Tomorrow" or short weekday. */
  label: string;
  dayNumber: string;
  month: string;
  isWeekend: boolean;
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Calendar day the night around `timestamp` started on. At 02:00 this still
 * returns the previous evening, which is what people mean by "tonight".
 */
export function nightDateOf(timestamp: Date = new Date()): Date {
  return startOfDay(new Date(timestamp.getTime() - NIGHT_START_HOUR * 60 * 60 * 1000));
}

/** The night window (06:00 -> next day 06:00) for a given calendar day. */
export function nightRange(date: Date): { start: Date; end: Date } {
  const start = startOfDay(date);
  start.setHours(NIGHT_START_HOUR, 0, 0, 0);
  return { start, end: addDays(start, 1) };
}

/** Which night a timestamp belongs to. */
export function nightKeyOf(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const shifted = new Date(date.getTime() - NIGHT_START_HOUR * 60 * 60 * 1000);
  return dayKey(shifted);
}

export function buildDayOptions(count = 14, from: Date = new Date()): DayOption[] {
  const first = nightDateOf(from);
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(first, index);
    const weekday = date.getDay();
    let label: string = WEEKDAYS_SHORT[weekday];
    if (index === 0) label = 'Today';
    else if (index === 1) label = 'Tomorrow';

    return {
      key: dayKey(date),
      date,
      label,
      dayNumber: String(date.getDate()),
      month: MONTHS_SHORT[date.getMonth()],
      isWeekend: weekday === 5 || weekday === 6,
    };
  });
}

export function formatDayHeadline(date: Date): string {
  const tonight = nightDateOf();
  if (isSameDay(date, tonight)) return 'Tonight in Berlin';
  if (isSameDay(date, addDays(tonight, 1))) return 'Tomorrow night';
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;
}

/** Compact label for the date filter button: "Today", "Tomorrow", "Sat, 4 Oct". */
export function formatDayButton(date: Date): string {
  const tonight = nightDateOf();
  if (isSameDay(date, tonight)) return 'Today';
  if (isSameDay(date, addDays(tonight, 1))) return 'Tomorrow';
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatMonthTitle(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Monday-first weekday initials for calendar headers. */
export const WEEKDAY_INITIALS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export interface CalendarCell {
  /** Stable key for rendering. */
  id: string;
  /** `null` for the padding cells of the first and last week. */
  date: Date | null;
}

export interface CalendarWeek {
  id: string;
  days: CalendarCell[];
}

/**
 * Monday-first calendar grid for the month of `month`. Leading and trailing
 * cells carry no date so the grid keeps its 7-column rhythm.
 */
export function buildMonthMatrix(month: Date): CalendarWeek[] {
  const first = startOfMonth(month);
  const total = endOfMonth(month).getDate();
  const leading = (first.getDay() + 6) % 7;
  const monthId = format(first, 'yyyy-MM');

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 0; day < total; day += 1) cells.push(addDays(first, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarWeek[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    const weekIndex = index / 7;
    weeks.push({
      id: `${monthId}-w${weekIndex}`,
      days: cells.slice(index, index + 7).map((date, position) => ({
        id: date ? dayKey(date) : `${monthId}-w${weekIndex}-p${position}`,
        date,
      })),
    });
  }
  return weeks;
}

export function formatTimeRange(startsAt: string, endsAt: string | null): string {
  const start = formatTime(startsAt);
  return endsAt ? `${start} – ${formatTime(endsAt)}` : start;
}

export function formatTime(timestamp: string): string {
  return format(new Date(timestamp), 'HH:mm');
}

export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} · ${format(date, 'HH:mm')}`;
}

/**
 * Entry price for the UI. `null` when the import carries no price at all, so
 * the screens can simply leave the line out instead of showing a placeholder.
 */
export function formatPrice(
  priceMin: number | null,
  priceMax: number | null,
  isFree: boolean | null,
): string | null {
  if (isFree) return 'Free entry';
  if (priceMin == null && priceMax == null) return null;
  if (priceMin != null && priceMax != null && priceMax > priceMin) {
    return `€${Math.round(priceMin)}–${Math.round(priceMax)}`;
  }
  const value = priceMin ?? priceMax;
  return value === 0 ? 'Free entry' : `from €${Math.round(value ?? 0)}`;
}
