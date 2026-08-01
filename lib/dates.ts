import { addDays, format, isSameDay, startOfDay } from 'date-fns';

/**
 * German labels are kept local on purpose: importing `date-fns/locale` pulls in
 * every locale of the package and breaks Metro's web bundle.
 */
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
const WEEKDAYS_LONG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const;
const MONTHS_LONG = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
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
  /** "Heute", "Morgen" or short weekday. */
  label: string;
  dayNumber: string;
  month: string;
  isWeekend: boolean;
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
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
  const today = startOfDay(from);
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index);
    const weekday = date.getDay();
    let label: string = WEEKDAYS_SHORT[weekday];
    if (isSameDay(date, today)) label = 'Heute';
    else if (isSameDay(date, addDays(today, 1))) label = 'Morgen';

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
  const today = startOfDay(new Date());
  if (isSameDay(date, today)) return 'Heute Abend';
  if (isSameDay(date, addDays(today, 1))) return 'Morgen Abend';
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()}. ${MONTHS_LONG[date.getMonth()]}`;
}

export function formatTime(timestamp: string): string {
  return format(new Date(timestamp), 'HH:mm');
}

export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()}. ${MONTHS_SHORT[date.getMonth()]} · ${format(date, 'HH:mm')}`;
}

export function formatPrice(
  priceMin: number | null,
  priceMax: number | null,
  isFree: boolean | null,
): string {
  if (isFree) return 'Eintritt frei';
  if (priceMin == null && priceMax == null) return 'Preis tbd';
  if (priceMin != null && priceMax != null && priceMax > priceMin) {
    return `${Math.round(priceMin)}–${Math.round(priceMax)} €`;
  }
  const value = priceMin ?? priceMax;
  return value === 0 ? 'Eintritt frei' : `ab ${Math.round(value ?? 0)} €`;
}
