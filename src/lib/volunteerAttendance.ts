import { ADELAIDE_TIME_ZONE, getAdelaideDate } from './volunteerSignIn.ts';

export { ADELAIDE_TIME_ZONE, getAdelaideDate };

/** Shown on the sign-in form. Bump the version whenever the wording changes. */
export const SIGN_IN_DECLARATION_TEXT =
  'I feel able to safely carry out today’s agreed volunteer activities. I will tell the coordinator about any limitations or support I need, follow safety instructions, and stop and report if I feel unwell, injured or unsafe.';
export const SIGN_IN_DECLARATION_VERSION = '2026-11';

/** Volunteers still signed in at this Adelaide wall-clock time are signed out automatically. */
export const AUTOMATIC_SIGN_OUT_HOUR = 17;

export type SignOutMethod = '' | 'confirmed' | 'automatic';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Convert an Adelaide wall-clock date and time to the matching UTC instant, handling daylight saving. */
export function adelaideTimeToUtc(value: string, hour = 0, minute = 0, timeZone = ADELAIDE_TIME_ZONE): Date {
  const [year, month, day] = value.split('-').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = targetAsUtc;
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );
    const displayedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    timestamp += targetAsUtc - displayedAsUtc;
  }

  return new Date(timestamp);
}

/**
 * When an open sign-in should be closed automatically: 5pm Adelaide time on the volunteer date.
 * Anyone who signs in after 5pm is instead closed at the end of that day, so a sign-out never
 * precedes its sign-in.
 */
export function automaticSignOutAt(volunteerDate: string, signedInAt: string): Date {
  const fivePm = adelaideTimeToUtc(volunteerDate, AUTOMATIC_SIGN_OUT_HOUR, 0);
  const signedIn = new Date(signedInAt);
  if (Number.isNaN(signedIn.getTime()) || signedIn < fivePm) return fivePm;
  return new Date(adelaideTimeToUtc(addDays(volunteerDate, 1)).getTime() - 60_000);
}

export function formatClockTime(value: string): string {
  if (!isValidTime(value)) return '';
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatExpectedTime(start: string, end: string): string {
  const startLabel = formatClockTime(start);
  const endLabel = formatClockTime(end);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  if (startLabel) return `from ${startLabel}`;
  if (endLabel) return `until ${endLabel}`;
  return '';
}
