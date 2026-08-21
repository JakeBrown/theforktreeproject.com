const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const MIN_ADMIN_YEAR = 2000;
const MAX_ADMIN_YEAR = 2100;

export type SignInAdminView = 'calendar' | 'list';

export interface SignInAdminParams {
  view: SignInAdminView;
  month: string;
  name: string;
}

export interface CalendarDay {
  date: string;
  dayNumber: number;
}

export interface CalendarWeek {
  days: Array<CalendarDay | null>;
}

function monthParts(value: string): [number, number] | null {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < MIN_ADMIN_YEAR || year > MAX_ADMIN_YEAR || month < 1 || month > 12) return null;
  return [year, month];
}

function monthValue(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function currentAdelaideMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Adelaide',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : now.toISOString().slice(0, 7);
}

export function getSignInAdminParams(searchParams: URLSearchParams, now = new Date()): SignInAdminParams {
  const requestedView = searchParams.get('view');
  const requestedMonth = (searchParams.get('month') || '').trim();
  const name = (searchParams.get('name') || '').trim().replace(/\s+/g, ' ').slice(0, 100);

  return {
    view: requestedView === 'list' ? 'list' : 'calendar',
    month: monthParts(requestedMonth) ? requestedMonth : currentAdelaideMonth(now),
    name,
  };
}

export function shiftMonth(value: string, offset: number): string {
  const [year, month] = monthParts(value) || monthParts(currentAdelaideMonth())!;
  return monthValue(year, month - 1 + offset);
}

export function monthBounds(value: string): [string, string] {
  return [`${value}-01`, `${shiftMonth(value, 1)}-01`];
}

export function formatMonth(value: string): string {
  const [year, month] = monthParts(value) || monthParts(currentAdelaideMonth())!;
  return new Intl.DateTimeFormat('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function calendarWeeks(value: string): CalendarWeek[] {
  const [year, month] = monthParts(value) || monthParts(currentAdelaideMonth())!;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const cells: Array<CalendarDay | null> = Array.from({ length: mondayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: `${value}-${String(day).padStart(2, '0')}`,
      dayNumber: day,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarWeek[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push({ days: cells.slice(index, index + 7) });
  }
  return weeks;
}

export function isDemoSignInName(value: string): boolean {
  return value.trimStart().startsWith('DEMO —');
}
