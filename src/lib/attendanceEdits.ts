/**
 * Admin corrections to attendance history: fix sign-in/out times, add a visit someone forgot to
 * sign in for, or delete a mistaken sign-in. Every change is written to volunteer_attendance_edits
 * with the admin's Access identity so the profile can show who changed what.
 */
import { adelaideTimeToUtc } from './volunteerAttendance.ts';
import { ensureVolunteerSchema, type D1Database } from './volunteerDb.ts';

const ADELAIDE_TIME_ZONE = 'Australia/Adelaide';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type EditResult = { ok: true } | { ok: false; error: string };

export interface AttendanceTimesInput {
  signIn: string;
  signOut: string;
}

interface OwnedVisit {
  sign_in_id: number;
  volunteer_date: string;
  signed_in_at: string;
  signed_out_at: string;
  sign_out_method: string;
}

/** "HH:MM" in Adelaide time for an ISO timestamp, for <input type="time"> values. */
export function adelaideTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: ADELAIDE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  return hour && minute ? `${hour}:${minute}` : '';
}

function toUtc(date: string, time: string): string {
  const match = TIME_PATTERN.exec(time)!;
  return adelaideTimeToUtc(date, Number(match[1]), Number(match[2])).toISOString();
}

/** Validate the times for a visit on `date`. Past visits need a sign-out time; today's may stay open. */
export function parseAttendanceTimes(
  date: string,
  input: AttendanceTimesInput,
  today: string,
  now: Date = new Date(),
): { ok: true; signedInAt: string; signedOutAt: string } | { ok: false; error: string } {
  const signIn = input.signIn.trim();
  const signOut = input.signOut.trim();
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { ok: false, error: 'Choose a valid date.' };
  if (date > today) return { ok: false, error: 'Visits can’t be in the future. Schedule a visit instead.' };
  if (!TIME_PATTERN.test(signIn)) return { ok: false, error: 'Enter the sign-in time.' };
  if (signOut && !TIME_PATTERN.test(signOut)) return { ok: false, error: 'Enter a valid sign-out time.' };
  if (!signOut && date < today) return { ok: false, error: 'Enter the sign-out time for a past visit.' };
  if (signOut && signOut <= signIn) return { ok: false, error: 'The sign-out time must be after the sign-in time.' };
  const signedInAt = toUtc(date, signIn);
  const signedOutAt = signOut ? toUtc(date, signOut) : '';
  // For today, times can't be later than now: an invented future sign-out would block the
  // volunteer's real sign-out at the kiosk.
  const latest = now.getTime() + 60_000;
  if (Date.parse(signedInAt) > latest) return { ok: false, error: 'The sign-in time can’t be later than now.' };
  if (signedOutAt && Date.parse(signedOutAt) > latest) {
    return { ok: false, error: 'The sign-out time can’t be later than now. Leave it blank if they are still here.' };
  }
  return { ok: true, signedInAt, signedOutAt };
}

async function ownedVisit(database: D1Database, signInId: number, volunteerId: number): Promise<OwnedVisit | null> {
  return database
    .prepare(
      `SELECT s.id AS sign_in_id, s.volunteer_date, s.signed_in_at, a.signed_out_at, a.sign_out_method
       FROM volunteer_sign_ins s JOIN volunteer_attendance a ON a.sign_in_id = s.id
       WHERE s.id = ?1 AND a.volunteer_id = ?2`
    )
    .bind(signInId, volunteerId)
    .first<OwnedVisit>();
}

function auditStatement(
  database: D1Database,
  signInId: number | { date: string; phoneNormalized: string },
  volunteerId: number,
  action: 'add' | 'edit' | 'delete',
  editedBy: string,
  details: unknown,
  now: Date,
) {
  // A {date, phoneNormalized} key finds a sign-in inserted earlier in the same batch.
  const sql = typeof signInId === 'number'
    ? `INSERT INTO volunteer_attendance_edits (sign_in_id, volunteer_id, action, edited_by, edited_at, details_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    : `INSERT INTO volunteer_attendance_edits (sign_in_id, volunteer_id, action, edited_by, edited_at, details_json)
       SELECT id, ?2, ?3, ?4, ?5, ?6 FROM volunteer_sign_ins WHERE volunteer_date = ?1 AND phone_normalized = ?7`;
  const bindings: unknown[] = typeof signInId === 'number'
    ? [signInId, volunteerId, action, editedBy, now.toISOString(), JSON.stringify(details)]
    : [signInId.date, volunteerId, action, editedBy, now.toISOString(), JSON.stringify(details), signInId.phoneNormalized];
  return database.prepare(sql).bind(...bindings);
}

export async function addManualVisit(
  database: D1Database,
  input: {
    volunteer: { id: number; full_name: string; phone: string; phone_normalized: string };
    date: string;
    times: AttendanceTimesInput;
    editedBy: string;
    today: string;
    now?: Date;
  },
): Promise<EditResult> {
  const now = input.now ?? new Date();
  const parsed = parseAttendanceTimes(input.date, input.times, input.today, now);
  if (!parsed.ok) return parsed;
  await ensureVolunteerSchema(database);

  const existing = await database
    .prepare(
      `SELECT 1 FROM volunteer_sign_ins s JOIN volunteer_attendance a ON a.sign_in_id = s.id
       WHERE a.volunteer_id = ?1 AND s.volunteer_date = ?2 LIMIT 1`
    )
    .bind(input.volunteer.id, input.date)
    .first();
  if (existing) return { ok: false, error: 'This volunteer already has a visit on that date. Edit it instead.' };

  // Sign-ins are unique per day and phone. Volunteers without a phone get a per-profile placeholder;
  // the attendance row is linked to the profile directly, so profile syncing never relinks it.
  const phoneNormalized = input.volunteer.phone_normalized || `manual-v${input.volunteer.id}`;
  const clash = await database
    .prepare('SELECT 1 FROM volunteer_sign_ins WHERE volunteer_date = ?1 AND phone_normalized = ?2 LIMIT 1')
    .bind(input.date, phoneNormalized)
    .first();
  if (clash) return { ok: false, error: 'Someone with this phone number already signed in that day.' };

  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO volunteer_sign_ins (full_name, email, email_normalized, phone, phone_normalized, volunteer_date, communications_consent, signed_in_at)
           VALUES (?1, '', '', ?2, ?3, ?4, 0, ?5)`
        )
        .bind(input.volunteer.full_name, input.volunteer.phone, phoneNormalized, input.date, parsed.signedInAt),
      database
        .prepare(
          `INSERT INTO volunteer_attendance (sign_in_id, volunteer_id, signed_out_at, sign_out_method)
           SELECT id, ?1, ?2, ?3 FROM volunteer_sign_ins WHERE volunteer_date = ?4 AND phone_normalized = ?5`
        )
        .bind(input.volunteer.id, parsed.signedOutAt, parsed.signedOutAt ? 'confirmed' : '', input.date, phoneNormalized),
      auditStatement(database, { date: input.date, phoneNormalized }, input.volunteer.id, 'add', input.editedBy, {
        date: input.date,
        after: { signedInAt: parsed.signedInAt, signedOutAt: parsed.signedOutAt },
      }, now),
    ]);
  } catch (error) {
    // A kiosk sign-in for the same day can land between the check above and this insert.
    if (/unique|constraint/i.test(error instanceof Error ? error.message : String(error))) {
      return { ok: false, error: 'This volunteer signed in that day while you were editing. Reload to see it.' };
    }
    throw error;
  }
  return { ok: true };
}

export async function editVisitTimes(
  database: D1Database,
  input: {
    signInId: number;
    volunteerId: number;
    times: AttendanceTimesInput;
    /** The stored timestamps the admin's form was showing; a mismatch means someone else changed it. */
    expected: { signedInAt: string; signedOutAt: string };
    editedBy: string;
    today: string;
    now?: Date;
  },
): Promise<EditResult> {
  await ensureVolunteerSchema(database);
  const now = input.now ?? new Date();
  const visit = await ownedVisit(database, input.signInId, input.volunteerId);
  if (!visit) return { ok: false, error: 'That visit could not be found.' };
  if (visit.signed_in_at !== input.expected.signedInAt || (visit.signed_out_at || '') !== input.expected.signedOutAt) {
    return { ok: false, error: 'This visit changed since the page loaded (for example the volunteer signed out). Reload and try again.' };
  }
  const parsed = parseAttendanceTimes(visit.volunteer_date, input.times, input.today, now);
  if (!parsed.ok) return parsed;

  // Keep stored values (and an automatic sign-out's label) for any time the admin didn't change.
  const signInChanged = input.times.signIn.trim() !== adelaideTimeInputValue(visit.signed_in_at);
  const signOutChanged = input.times.signOut.trim() !== adelaideTimeInputValue(visit.signed_out_at);
  if (!signInChanged && !signOutChanged) return { ok: true };
  const signedInAt = signInChanged ? parsed.signedInAt : visit.signed_in_at;
  const signedOutAt = signOutChanged ? parsed.signedOutAt : visit.signed_out_at;
  const signOutMethod = signOutChanged ? (parsed.signedOutAt ? 'confirmed' : '') : visit.sign_out_method;

  await database.batch([
    database.prepare('UPDATE volunteer_sign_ins SET signed_in_at = ?1 WHERE id = ?2').bind(signedInAt, visit.sign_in_id),
    database
      .prepare('UPDATE volunteer_attendance SET signed_out_at = ?1, sign_out_method = ?2 WHERE sign_in_id = ?3')
      .bind(signedOutAt, signOutMethod, visit.sign_in_id),
    auditStatement(database, visit.sign_in_id, input.volunteerId, 'edit', input.editedBy, {
      date: visit.volunteer_date,
      before: { signedInAt: visit.signed_in_at, signedOutAt: visit.signed_out_at, signOutMethod: visit.sign_out_method },
      after: { signedInAt, signedOutAt, signOutMethod },
    }, now),
  ]);
  return { ok: true };
}

export async function deleteVisit(
  database: D1Database,
  input: { signInId: number; volunteerId: number; editedBy: string; now?: Date },
): Promise<EditResult> {
  await ensureVolunteerSchema(database);
  const visit = await ownedVisit(database, input.signInId, input.volunteerId);
  if (!visit) return { ok: false, error: 'That visit could not be found.' };

  await database.batch([
    // Keep a snapshot in the audit log so a mistaken delete can be put back by hand.
    auditStatement(database, visit.sign_in_id, input.volunteerId, 'delete', input.editedBy, {
      date: visit.volunteer_date,
      before: { signedInAt: visit.signed_in_at, signedOutAt: visit.signed_out_at, signOutMethod: visit.sign_out_method },
    }, input.now ?? new Date()),
    database.prepare('DELETE FROM volunteer_attendance WHERE sign_in_id = ?1').bind(visit.sign_in_id),
    database.prepare('DELETE FROM volunteer_sign_ins WHERE id = ?1').bind(visit.sign_in_id),
  ]);
  return { ok: true };
}
