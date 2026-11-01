import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCalendarEntries,
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  type CalendarVolunteer,
} from '../src/lib/volunteerCalendar.ts';

const volunteer = (id: number, fullName: string): CalendarVolunteer => ({
  id,
  fullName,
  preferredName: '',
  phone: '0412 345 678',
  email: 'v@example.com',
  emergencyContactName: 'Bo Lee',
  emergencyContactRelationship: 'Partner',
  emergencyContactPhone: '0400 000 000',
  secondaryEmergencyContactName: '',
  secondaryEmergencyContactRelationship: '',
  secondaryEmergencyContactPhone: '',
});

test('a sign-in replaces the scheduled visit for that volunteer and day', () => {
  const entries = buildCalendarEntries(
    [
      { signInId: 1, date: '2026-11-03', signedInAt: '2026-11-02T22:30:00.000Z', signedOutAt: '', signOutMethod: '', volunteer: volunteer(1, 'Ann Lee') },
      { signInId: 2, date: '2026-11-03', signedInAt: '2026-11-02T22:30:00.000Z', signedOutAt: '2026-11-03T06:30:00.000Z', signOutMethod: 'automatic', volunteer: volunteer(2, 'Cam Ng') },
    ],
    [
      { visitId: 10, date: '2026-11-03', startTime: '09:00', endTime: '15:00', notes: '', volunteer: volunteer(1, 'Ann Lee') },
      { visitId: 11, date: '2026-11-10', startTime: '09:00', endTime: '', notes: 'Nursery', volunteer: volunteer(1, 'Ann Lee') },
    ]
  );

  assert.deepEqual(entries.map((entry) => [entry.date, entry.volunteer.fullName, entry.status]), [
    ['2026-11-03', 'Ann Lee', 'signed-in'],
    ['2026-11-03', 'Cam Ng', 'signed-out'],
    ['2026-11-10', 'Ann Lee', 'scheduled'],
  ]);
  assert.equal(entries[0].expectedTime, '9:00 am – 3:00 pm');
});

test('ICS output has all-day events with status markers, contacts and folded lines', () => {
  const entries = buildCalendarEntries(
    [{ signInId: 2, date: '2026-11-03', signedInAt: '2026-11-02T22:30:00.000Z', signedOutAt: '2026-11-03T06:30:00.000Z', signOutMethod: 'automatic', volunteer: volunteer(2, 'Cam Ng') }],
    [{ visitId: 11, date: '2026-12-31', startTime: '09:00', endTime: '', notes: 'Bring gloves, hat; water', volunteer: volunteer(1, 'Ann Lee') }]
  );
  const ics = buildIcsCalendar(entries, { calendarName: 'Forktree volunteers', generatedAt: new Date('2026-11-01T00:00:00Z') });
  const unfolded = ics.replace(/\r\n /g, '');

  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(unfolded, /DTSTART;VALUE=DATE:20261103\r\nDTEND;VALUE=DATE:20261104/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101/);
  assert.match(unfolded, /SUMMARY:🔵 Cam Ng · Signed out\\, auto/);
  assert.match(unfolded, /SUMMARY:🟡 Ann Lee · Scheduled · from 9:00 am/);
  assert.match(unfolded, /Signed out: 5:00 pm \(automatic\\, not confirmed by volunteer\)/);
  assert.match(unfolded, /Emergency contact: Bo Lee \(Partner\): 0400 000 000/);
  assert.match(unfolded, /Visit notes: Bring gloves\\, hat\\; water/);
  assert.match(unfolded, /CATEGORIES:Scheduled\r\nCOLOR:goldenrod/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});

test('ICS escaping and folding', () => {
  assert.equal(escapeIcsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
  const folded = foldIcsLine(`DESCRIPTION:${'é'.repeat(60)}`);
  assert.ok(folded.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75));
  assert.equal(folded.replace(/\r\n /g, ''), `DESCRIPTION:${'é'.repeat(60)}`);
});
