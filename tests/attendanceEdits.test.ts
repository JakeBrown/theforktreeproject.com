import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addManualVisit,
  adelaideTimeInputValue,
  deleteVisit,
  editVisitTimes,
  parseAttendanceTimes,
} from '../src/lib/attendanceEdits.ts';
import { ensureVolunteerSchema, syncVolunteerProfiles } from '../src/lib/volunteerDb.ts';
import { createD1 } from './helpers/d1Shim.ts';

const TODAY = '2026-11-24';
const NOW = new Date('2026-11-24T08:00:00.000Z'); // 6:30 pm Adelaide
const volunteer = { id: 1, full_name: 'Ann Lee', phone: '0400 000 001', phone_normalized: '61400000001' };
const noPhone = { id: 2, full_name: 'Bo Ng', phone: '', phone_normalized: '' };

async function setup() {
  const db = createD1();
  await ensureVolunteerSchema(db);
  db.sqlite.exec(`INSERT INTO volunteers (id, full_name, phone, phone_normalized, created_at, updated_at) VALUES
    (1, 'Ann Lee', '0400 000 001', '61400000001', 'x', 'x'), (2, 'Bo Ng', '', '', 'x', 'x')`);
  return db;
}

const rows = (db: ReturnType<typeof createD1>, sql: string) => db.sqlite.prepare(sql).all() as any[];

test('validates times', () => {
  assert.equal(parseAttendanceTimes('2026-11-25', { signIn: '09:00', signOut: '12:00' }, TODAY).ok, false);
  assert.equal(parseAttendanceTimes('2026-11-20', { signIn: '09:00', signOut: '' }, TODAY).ok, false);
  assert.equal(parseAttendanceTimes('2026-11-20', { signIn: '12:00', signOut: '09:00' }, TODAY).ok, false);
  assert.equal(parseAttendanceTimes('2026-11-20', { signIn: '9am', signOut: '12:00' }, TODAY).ok, false);
  const open = parseAttendanceTimes(TODAY, { signIn: '09:00', signOut: '' }, TODAY, NOW);
  assert.deepEqual(open, { ok: true, signedInAt: '2026-11-23T22:30:00.000Z', signedOutAt: '' });
  assert.equal(adelaideTimeInputValue('2026-11-23T22:30:00.000Z'), '09:00');
});

test('adds a missed visit linked to the profile and audited', async () => {
  const db = await setup();
  const result = await addManualVisit(db, { volunteer, date: '2026-11-20', times: { signIn: '09:00', signOut: '13:30' }, editedBy: 'liz@example.org', today: TODAY });
  assert.deepEqual(result, { ok: true });
  const [visit] = rows(db, `SELECT s.volunteer_date, s.phone_normalized, a.volunteer_id, a.signed_out_at, a.sign_out_method
    FROM volunteer_sign_ins s JOIN volunteer_attendance a ON a.sign_in_id = s.id`);
  assert.deepEqual({ ...visit }, { volunteer_date: '2026-11-20', phone_normalized: '61400000001', volunteer_id: 1, signed_out_at: '2026-11-20T03:00:00.000Z', sign_out_method: 'confirmed' });
  const [audit] = rows(db, 'SELECT sign_in_id, action, edited_by FROM volunteer_attendance_edits');
  assert.equal(audit.action, 'add');
  assert.equal(audit.edited_by, 'liz@example.org');
  assert.ok(audit.sign_in_id > 0);

  const again = await addManualVisit(db, { volunteer, date: '2026-11-20', times: { signIn: '10:00', signOut: '11:00' }, editedBy: 'x', today: TODAY });
  assert.equal(again.ok, false);
});

test('manual visits for volunteers without a phone never create extra profiles', async () => {
  const db = await setup();
  assert.deepEqual(await addManualVisit(db, { volunteer: noPhone, date: '2026-11-20', times: { signIn: '09:00', signOut: '10:00' }, editedBy: 'x', today: TODAY }), { ok: true });
  assert.deepEqual(await addManualVisit(db, { volunteer: noPhone, date: '2026-11-21', times: { signIn: '09:00', signOut: '10:00' }, editedBy: 'x', today: TODAY }), { ok: true });
  await syncVolunteerProfiles(db);
  assert.equal(rows(db, 'SELECT COUNT(*) n FROM volunteers')[0].n, 2);
  assert.deepEqual(rows(db, 'SELECT DISTINCT volunteer_id FROM volunteer_attendance').map((row) => row.volunteer_id), [2]);
});

test('edits times only for the owning volunteer, replacing an automatic sign-out', async () => {
  const db = await setup();
  await addManualVisit(db, { volunteer, date: '2026-11-20', times: { signIn: '09:00', signOut: '17:00' }, editedBy: 'x', today: TODAY });
  const signInId = rows(db, 'SELECT id FROM volunteer_sign_ins')[0].id;
  db.sqlite.exec(`UPDATE volunteer_attendance SET sign_out_method = 'automatic'`);

  const expected = { signedInAt: '2026-11-19T22:30:00.000Z', signedOutAt: '2026-11-20T06:30:00.000Z' };
  assert.equal((await editVisitTimes(db, { signInId, volunteerId: 2, times: { signIn: '09:00', signOut: '15:00' }, expected, editedBy: 'x', today: TODAY })).ok, false);
  assert.deepEqual(await editVisitTimes(db, { signInId, volunteerId: 1, times: { signIn: '08:30', signOut: '15:00' }, expected, editedBy: 'maddie@example.org', today: TODAY }), { ok: true });
  const [visit] = rows(db, 'SELECT s.signed_in_at, a.signed_out_at, a.sign_out_method FROM volunteer_sign_ins s JOIN volunteer_attendance a ON a.sign_in_id = s.id');
  assert.deepEqual({ ...visit }, { signed_in_at: '2026-11-19T22:00:00.000Z', signed_out_at: '2026-11-20T04:30:00.000Z', sign_out_method: 'confirmed' });
  const edit = rows(db, `SELECT details_json FROM volunteer_attendance_edits WHERE action = 'edit'`)[0];
  assert.equal(JSON.parse(edit.details_json).before.signOutMethod, 'automatic');
});

test('deletes a visit and keeps an audit snapshot', async () => {
  const db = await setup();
  await addManualVisit(db, { volunteer, date: '2026-11-20', times: { signIn: '09:00', signOut: '12:00' }, editedBy: 'x', today: TODAY });
  const signInId = rows(db, 'SELECT id FROM volunteer_sign_ins')[0].id;
  assert.equal((await deleteVisit(db, { signInId, volunteerId: 2, editedBy: 'x' })).ok, false);
  assert.deepEqual(await deleteVisit(db, { signInId, volunteerId: 1, editedBy: 'jake@example.org' }), { ok: true });
  assert.equal(rows(db, 'SELECT COUNT(*) n FROM volunteer_sign_ins')[0].n, 0);
  assert.equal(rows(db, 'SELECT COUNT(*) n FROM volunteer_attendance')[0].n, 0);
  const deleted = rows(db, `SELECT details_json FROM volunteer_attendance_edits WHERE action = 'delete'`)[0];
  assert.equal(JSON.parse(deleted.details_json).before.signedInAt, '2026-11-19T22:30:00.000Z');
  await syncVolunteerProfiles(db);
  assert.equal(rows(db, 'SELECT COUNT(*) n FROM volunteer_attendance')[0].n, 0);
});

test('today: times cannot be later than now', () => {
  const morning = new Date('2026-11-23T23:30:00.000Z'); // 10:00 am Adelaide on TODAY
  assert.equal(parseAttendanceTimes(TODAY, { signIn: '09:00', signOut: '15:00' }, TODAY, morning).ok, false);
  assert.equal(parseAttendanceTimes(TODAY, { signIn: '11:00', signOut: '' }, TODAY, morning).ok, false);
  assert.equal(parseAttendanceTimes(TODAY, { signIn: '09:00', signOut: '' }, TODAY, morning).ok, true);
});

test('an edit is refused if the visit changed since the page loaded', async () => {
  const db = await setup();
  await addManualVisit(db, { volunteer, date: TODAY, times: { signIn: '09:00', signOut: '' }, editedBy: 'x', today: TODAY, now: NOW });
  const signInId = rows(db, 'SELECT id FROM volunteer_sign_ins')[0].id;
  const stale = { signedInAt: '2026-11-23T22:30:00.000Z', signedOutAt: '' };
  // The volunteer signs out at the kiosk after the admin opened the page.
  db.sqlite.exec(`UPDATE volunteer_attendance SET signed_out_at = '2026-11-24T03:30:00.000Z', sign_out_method = 'confirmed'`);
  const result = await editVisitTimes(db, { signInId, volunteerId: 1, times: { signIn: '08:30', signOut: '' }, expected: stale, editedBy: 'x', today: TODAY, now: NOW });
  assert.equal(result.ok, false);
  assert.equal(rows(db, 'SELECT signed_out_at FROM volunteer_attendance')[0].signed_out_at, '2026-11-24T03:30:00.000Z');
});

test('changing only the sign-in keeps an automatic sign-out as automatic', async () => {
  const db = await setup();
  await addManualVisit(db, { volunteer, date: '2026-11-20', times: { signIn: '09:00', signOut: '17:00' }, editedBy: 'x', today: TODAY });
  const signInId = rows(db, 'SELECT id FROM volunteer_sign_ins')[0].id;
  db.sqlite.exec(`UPDATE volunteer_attendance SET sign_out_method = 'automatic'`);
  const expected = { signedInAt: '2026-11-19T22:30:00.000Z', signedOutAt: '2026-11-20T06:30:00.000Z' };
  assert.deepEqual(await editVisitTimes(db, { signInId, volunteerId: 1, times: { signIn: '08:00', signOut: '17:00' }, expected, editedBy: 'x', today: TODAY }), { ok: true });
  const [visit] = rows(db, 'SELECT s.signed_in_at, a.sign_out_method FROM volunteer_sign_ins s JOIN volunteer_attendance a ON a.sign_in_id = s.id');
  assert.deepEqual({ ...visit }, { signed_in_at: '2026-11-19T21:30:00.000Z', sign_out_method: 'automatic' });
  // Saving with no changes writes nothing.
  const before = rows(db, 'SELECT COUNT(*) n FROM volunteer_attendance_edits')[0].n;
  const current = { signedInAt: '2026-11-19T21:30:00.000Z', signedOutAt: '2026-11-20T06:30:00.000Z' };
  await editVisitTimes(db, { signInId, volunteerId: 1, times: { signIn: '08:00', signOut: '17:00' }, expected: current, editedBy: 'x', today: TODAY });
  assert.equal(rows(db, 'SELECT COUNT(*) n FROM volunteer_attendance_edits')[0].n, before);
});
