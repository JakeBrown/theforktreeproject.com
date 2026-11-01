import { addDays, formatExpectedTime, type SignOutMethod } from './volunteerAttendance.ts';

export type CalendarStatus = 'signed-in' | 'signed-out' | 'scheduled';

export const CALENDAR_STATUSES: ReadonlyArray<{
  value: CalendarStatus;
  label: string;
  /** Emoji dot in the event title: the one colour cue every calendar app shows, including Outlook. */
  marker: string;
  /** RFC 7986 COLOR (a CSS colour name), used by Apple Calendar and some others. */
  icsColor: string;
}> = [
  { value: 'signed-in', label: 'Signed in', marker: '🟢', icsColor: 'forestgreen' },
  { value: 'signed-out', label: 'Signed out', marker: '🔵', icsColor: 'royalblue' },
  { value: 'scheduled', label: 'Scheduled', marker: '🟡', icsColor: 'goldenrod' },
];

export function isCalendarStatus(value: string): value is CalendarStatus {
  return CALENDAR_STATUSES.some((status) => status.value === value);
}

export function statusInfo(status: CalendarStatus) {
  return CALENDAR_STATUSES.find((item) => item.value === status)!;
}

export interface CalendarVolunteer {
  id: number | null;
  fullName: string;
  preferredName: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  secondaryEmergencyContactName: string;
  secondaryEmergencyContactRelationship: string;
  secondaryEmergencyContactPhone: string;
}

export interface AttendanceRecord {
  signInId: number;
  date: string;
  signedInAt: string;
  signedOutAt: string;
  signOutMethod: SignOutMethod;
  volunteer: CalendarVolunteer;
}

export interface ScheduledVisitRecord {
  visitId: number;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  volunteer: CalendarVolunteer;
}

export interface CalendarEntry {
  uid: string;
  date: string;
  status: CalendarStatus;
  volunteer: CalendarVolunteer;
  expectedTime: string;
  visitNotes: string;
  signedInAt: string;
  signedOutAt: string;
  signOutMethod: SignOutMethod;
}

/**
 * One entry per volunteer per day. A sign-in replaces the scheduled visit for that volunteer and
 * day, keeping the expected time from the schedule.
 */
export function buildCalendarEntries(
  attendance: AttendanceRecord[],
  visits: ScheduledVisitRecord[]
): CalendarEntry[] {
  const visitKey = (volunteerId: number | null, date: string) => `${volunteerId ?? 'none'}|${date}`;
  const visitsByKey = new Map<string, ScheduledVisitRecord>();
  for (const visit of visits) {
    if (visit.volunteer.id === null) continue;
    const key = visitKey(visit.volunteer.id, visit.date);
    if (!visitsByKey.has(key)) visitsByKey.set(key, visit);
  }

  const entries: CalendarEntry[] = [];
  const usedVisitKeys = new Set<string>();

  for (const record of attendance) {
    const key = visitKey(record.volunteer.id, record.date);
    const visit = record.volunteer.id === null ? undefined : visitsByKey.get(key);
    if (visit) usedVisitKeys.add(key);
    entries.push({
      uid: `sign-in-${record.signInId}@theforktreeproject.com`,
      date: record.date,
      status: record.signedOutAt ? 'signed-out' : 'signed-in',
      volunteer: record.volunteer,
      expectedTime: visit ? formatExpectedTime(visit.startTime, visit.endTime) : '',
      visitNotes: visit?.notes || '',
      signedInAt: record.signedInAt,
      signedOutAt: record.signedOutAt,
      signOutMethod: record.signOutMethod,
    });
  }

  for (const visit of visits) {
    const key = visitKey(visit.volunteer.id, visit.date);
    if (usedVisitKeys.has(key)) continue;
    usedVisitKeys.add(key);
    entries.push({
      uid: `visit-${visit.visitId}@theforktreeproject.com`,
      date: visit.date,
      status: 'scheduled',
      volunteer: visit.volunteer,
      expectedTime: formatExpectedTime(visit.startTime, visit.endTime),
      visitNotes: visit.notes,
      signedInAt: '',
      signedOutAt: '',
      signOutMethod: '',
    });
  }

  return entries.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.volunteer.fullName.localeCompare(right.volunteer.fullName, 'en-AU', { sensitivity: 'base' })
  );
}

function formatAdelaideTime(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Adelaide',
  }).format(date);
}

function contactLine(name: string, relationship: string, phone: string): string {
  if (!name && !phone) return '';
  const label = relationship ? `${name || 'Unnamed'} (${relationship})` : name || 'Unnamed';
  return phone ? `${label}: ${phone}` : label;
}

export function entryDescriptionLines(entry: CalendarEntry): string[] {
  const { volunteer } = entry;
  const lines = [`Status: ${statusInfo(entry.status).label}`];
  lines.push(`Expected: ${entry.expectedTime || 'No time scheduled'}`);
  if (entry.signedInAt) lines.push(`Signed in: ${formatAdelaideTime(entry.signedInAt)}`);
  if (entry.signedOutAt) {
    const method = entry.signOutMethod === 'automatic' ? 'automatic, not confirmed by volunteer' : 'confirmed by volunteer';
    lines.push(`Signed out: ${formatAdelaideTime(entry.signedOutAt)} (${method})`);
  }
  if (entry.visitNotes) lines.push(`Visit notes: ${entry.visitNotes}`);
  lines.push('');
  lines.push(`Phone: ${volunteer.phone || 'Not provided'}`);
  lines.push(`Email: ${volunteer.email || 'Not provided'}`);
  lines.push('');
  const primary = contactLine(
    volunteer.emergencyContactName,
    volunteer.emergencyContactRelationship,
    volunteer.emergencyContactPhone
  );
  const secondary = contactLine(
    volunteer.secondaryEmergencyContactName,
    volunteer.secondaryEmergencyContactRelationship,
    volunteer.secondaryEmergencyContactPhone
  );
  lines.push(`Emergency contact: ${primary || 'Not provided'}`);
  if (secondary) lines.push(`Second emergency contact: ${secondary}`);
  return lines;
}

export function entryTitle(entry: CalendarEntry): string {
  const info = statusInfo(entry.status);
  const name = entry.volunteer.preferredName && entry.volunteer.preferredName !== entry.volunteer.fullName
    ? `${entry.volunteer.fullName} (${entry.volunteer.preferredName})`
    : entry.volunteer.fullName;
  const automatic = entry.status === 'signed-out' && entry.signOutMethod === 'automatic' ? ', auto' : '';
  const time = entry.status === 'scheduled' && entry.expectedTime ? ` · ${entry.expectedTime}` : '';
  return `${info.marker} ${name} · ${info.label}${automatic}${time}`;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold content lines at 75 octets without splitting a UTF-8 character (RFC 5545 §3.1). */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsDate(value: string): string {
  return value.replace(/-/g, '');
}

function icsTimestamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export interface IcsOptions {
  calendarName: string;
  generatedAt?: Date;
}

export function buildIcsCalendar(entries: CalendarEntry[], options: IcsOptions): string {
  const stamp = icsTimestamp(options.generatedAt || new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Forktree Project//Volunteer Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
    `NAME:${escapeIcsText(options.calendarName)}`,
    'X-WR-TIMEZONE:Australia/Adelaide',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const entry of entries) {
    const info = statusInfo(entry.status);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(entry.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(entry.date, 1))}`,
      `SUMMARY:${escapeIcsText(entryTitle(entry))}`,
      `DESCRIPTION:${escapeIcsText(entryDescriptionLines(entry).join('\n'))}`,
      `CATEGORIES:${escapeIcsText(info.label)}`,
      `COLOR:${info.icsColor}`,
      'TRANSP:TRANSPARENT',
      'CLASS:PRIVATE',
      'X-MICROSOFT-CDO-BUSYSTATUS:FREE',
      'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
