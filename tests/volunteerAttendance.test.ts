import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adelaideTimeToUtc,
  automaticSignOutAt,
  formatExpectedTime,
} from '../src/lib/volunteerAttendance.ts';
import {
  applyAutomaticSignOuts,
  ensureVolunteerSchema,
  syncVolunteerProfiles,
} from '../src/lib/volunteerDb.ts';
import { validateVolunteerSignIn, validateVolunteerSignOut } from '../src/lib/volunteerSignIn.ts';
import { createD1 } from './helpers/d1Shim.ts';

test('5pm Adelaide converts to UTC in both daylight saving and standard time', () => {
  // ACDT (UTC+10:30) in summer, ACST (UTC+9:30) in winter.
  assert.equal(adelaideTimeToUtc('2026-11-03', 17).toISOString(), '2026-11-03T06:30:00.000Z');
  assert.equal(adelaideTimeToUtc('2026-07-14', 17).toISOString(), '2026-07-14T07:30:00.000Z');
});

test('automatic sign-out is 5pm, or end of day for sign-ins after 5pm', () => {
  assert.equal(automaticSignOutAt('2026-11-03', '2026-11-02T22:30:00.000Z').toISOString(), '2026-11-03T06:30:00.000Z');
  // Signed in at 5:30pm ACDT.
  assert.equal(automaticSignOutAt('2026-11-03', '2026-11-03T07:00:00.000Z').toISOString(), '2026-11-03T13:29:00.000Z');
});

test('sign-in requires the declaration; sign-out needs only a phone number', () => {
  const base = { fullName: 'Ann Lee', phone: '0412 345 678', volunteerDate: '2026-11-03' };
  const missing = validateVolunteerSignIn(base, '2026-11-03');
  assert.equal(missing.success, false);
  assert.ok(!missing.success && missing.errors.declarationAccepted);
  assert.equal(validateVolunteerSignIn({ ...base, declarationAccepted: true }, '2026-11-03').success, true);

  const signOut = validateVolunteerSignOut({ phone: '+61 412 345 678' });
  assert.ok(signOut.success && signOut.phoneNormalized === '0412345678');
  assert.equal(validateVolunteerSignOut({ phone: '12' }).success, false);
});

test('expected time labels', () => {
  assert.equal(formatExpectedTime('09:00', '15:30'), '9:00 am – 3:30 pm');
  assert.equal(formatExpectedTime('12:15', ''), 'from 12:15 pm');
  assert.equal(formatExpectedTime('', ''), '');
});

async function seed() {
  const database = createD1();
  await ensureVolunteerSchema(database);
  database.sqlite.exec(`
    CREATE TABLE volunteer_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT, preferred_name TEXT, phone TEXT, phone_normalized TEXT,
      email TEXT, address TEXT, emergency_contact_name TEXT, emergency_contact_relationship TEXT,
      emergency_contact_phone TEXT, accessibility_support TEXT, medical_information TEXT
    );
    INSERT INTO volunteer_registrations (full_name, preferred_name, phone, phone_normalized, email, address,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, accessibility_support, medical_information)
    VALUES ('Ann Lee', 'Annie', '0412 345 678', '0412345678', 'ann@example.com', '1 Main Rd', 'Bo Lee', 'Partner', '0400 000 000', '', 'Asthma');
    INSERT INTO volunteer_sign_ins (full_name, email, email_normalized, phone, phone_normalized, volunteer_date, signed_in_at)
    VALUES
      ('Ann Lee', '', '', '0412 345 678', '0412345678', '2026-11-02', '2026-11-01T23:00:00.000Z'),
      ('Cam Ng', '', '', '0499 111 222', '0499111222', '2026-11-02', '2026-11-01T23:30:00.000Z'),
      ('Cam Ng', '', '', '0499 111 222', '0499111222', '2026-11-03', '2026-11-02T23:30:00.000Z');
  `);
  return database;
}

test('profile sync creates one profile per person and links every sign-in', async () => {
  const database = await seed();
  await syncVolunteerProfiles(database);
  await syncVolunteerProfiles(database); // idempotent

  const volunteers = database.sqlite.prepare('SELECT * FROM volunteers ORDER BY id').all() as any[];
  assert.equal(volunteers.length, 2);
  assert.equal(volunteers[0].full_name, 'Ann Lee');
  assert.equal(volunteers[0].preferred_name, 'Annie');
  assert.equal(volunteers[0].emergency_contact_phone, '0400 000 000');
  assert.equal(volunteers[0].support_needs, 'Asthma');
  assert.equal(volunteers[1].full_name, 'Cam Ng');

  const unlinked = database.sqlite.prepare('SELECT COUNT(*) AS n FROM volunteer_attendance WHERE volunteer_id IS NULL').get() as any;
  const linked = database.sqlite.prepare('SELECT COUNT(*) AS n FROM volunteer_attendance').get() as any;
  assert.equal(unlinked.n, 0);
  assert.equal(linked.n, 3);
});

test('editing a profile phone does not recreate a profile for the old number', async () => {
  const database = await seed();
  await syncVolunteerProfiles(database);
  database.sqlite.exec("UPDATE volunteers SET phone = '0411 999 999', phone_normalized = '0411999999' WHERE full_name = 'Ann Lee'");
  await syncVolunteerProfiles(database);
  const count = database.sqlite.prepare('SELECT COUNT(*) AS n FROM volunteers').get() as any;
  assert.equal(count.n, 2);
});

test('automatic sign-out closes only open sign-ins whose 5pm has passed', async () => {
  const database = await seed();
  await syncVolunteerProfiles(database);
  database.sqlite.exec(`UPDATE volunteer_attendance SET signed_out_at = '2026-11-02T04:00:00.000Z', sign_out_method = 'confirmed' WHERE sign_in_id = 1`);

  // 4pm ACDT on 3 Nov: the 2 Nov sign-in for Cam is closed, today's is still open.
  const closed = await applyAutomaticSignOuts(database, new Date('2026-11-03T05:30:00.000Z'));
  assert.equal(closed, 1);
  const rows = database.sqlite.prepare('SELECT sign_in_id, signed_out_at, sign_out_method FROM volunteer_attendance ORDER BY sign_in_id').all() as any[];
  assert.deepEqual(rows.map((row) => row.sign_out_method), ['confirmed', 'automatic', '']);
  assert.equal(rows[1].signed_out_at, '2026-11-02T06:30:00.000Z');

  // After 5pm the remaining sign-in closes too.
  assert.equal(await applyAutomaticSignOuts(database, new Date('2026-11-03T06:31:00.000Z')), 1);
});
