import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildMailerLiteSubscriber,
  getMailerLiteSyncStatus,
  syncRegistrationsToMailerLite,
  type MailerLiteRegistrationRow,
} from '../src/lib/mailerliteSync.ts';
import { createD1 } from './helpers/d1Shim.ts';

const env = { MAILERLITE_API_KEY: 'test-key', MAILERLITE_VOLUNTEERS_GROUP_ID: 'group-1' };

const row: MailerLiteRegistrationRow = {
  id: 7,
  full_name: 'Janithya  Dharmawardhane Silva',
  preferred_name: 'Jani',
  is_under_18: 0,
  phone: '0412 345 678',
  email: 'jani@example.com',
  interests_json: '["planting","other"]',
  interest_other: 'Bird surveys',
  frequency: 'monthly',
  preferred_days_json: '["monday","saturday"]',
  registered_at: '2026-10-21T14:00:00.000Z',
};

function database() {
  const db = createD1();
  db.sqlite.exec(readFileSync(new URL('../migrations/0003_create_volunteer_registrations.sql', import.meta.url), 'utf8'));
  return db;
}

function insertRegistration(db: ReturnType<typeof createD1>, id: number, email: string, name = 'Sam Example') {
  db.sqlite
    .prepare(
      `INSERT INTO volunteer_registrations (id, full_name, preferred_name, is_under_18, date_of_birth, address, phone,
        phone_normalized, email, email_normalized, referral_sources_json, referral_other, emergency_contact_name,
        emergency_contact_relationship, emergency_contact_phone, emergency_contact_phone_normalized, interests_json,
        interest_other, skills_experience, qualifications_json, licences_json, licence_other, wwcc_status, wwcc_number,
        wwcc_expiry_date, frequency, preferred_days_json, accessibility_support, medical_information, media_consent,
        declaration_name, agreement_accepted, form_version, registered_at)
       VALUES (?, ?, '', 0, '1990-01-01', 'Addr', '0400000000', '61400000000', ?, ?, '[]', '', 'EC', 'Friend',
        '0400000001', '61400000001', '[]', '', '', '[]', '[]', '', '', '', '', 'monthly', '[]', '', '', 'consent',
        ?, 1, 'test', ?)`
    )
    .run(id, name, email, email.toLowerCase(), name, `2026-11-0${id}T01:00:00.000Z`);
}

function recorder(status = 200) {
  const calls: Array<{ url: string; body: any; auth: string }> = [];
  const fetcher = async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), auth: String((init.headers as any).authorization) });
    return { ok: status < 300, status, text: async () => '{"message":"The email must be a valid email address."}' };
  };
  return { calls, fetcher };
}

test('builds the subscriber payload with readable labels and the group', () => {
  const payload = buildMailerLiteSubscriber(row, 'group-1');
  assert.equal(payload.email, 'jani@example.com');
  assert.deepEqual(payload.groups, ['group-1']);
  assert.equal(payload.fields.name, 'Janithya');
  assert.equal(payload.fields.last_name, 'Dharmawardhane Silva');
  assert.equal(payload.fields.preferred_name, 'Jani');
  assert.equal(payload.fields.under_18, 'No');
  assert.match(payload.fields.volunteer_interests, /Other: Bird surveys$/);
  assert.doesNotMatch(payload.fields.volunteer_interests, /^Other,|, Other,/);
  assert.equal(payload.fields.preferred_days, 'Monday, Saturday');
  assert.equal(payload.fields.volunteer_registered, '2026-10-22'); // Adelaide date
  assert.equal('status' in payload, false); // never resubscribes people who unsubscribed
});

test('does nothing when not configured', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const { calls, fetcher } = recorder();
  const result = await syncRegistrationsToMailerLite(db, {}, { fetcher });
  assert.equal(result.skipped, 'not configured');
  assert.equal(calls.length, 0);
});

test('syncs only the newest registration per email, once', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com', 'Old Name');
  insertRegistration(db, 2, 'A@example.com', 'New Name');
  insertRegistration(db, 3, 'b@example.com');
  const { calls, fetcher } = recorder();

  const first = await syncRegistrationsToMailerLite(db, env, { fetcher, now: new Date('2026-11-24T00:00:00Z') });
  assert.deepEqual(first, { attempted: 2, synced: 2, failed: 0 });
  assert.deepEqual(calls.map((call) => call.body.fields.name), ['New', 'Sam']);
  assert.equal(calls[0].auth, 'Bearer test-key');
  assert.equal(calls[0].url, 'https://connect.mailerlite.com/api/subscribers');

  const second = await syncRegistrationsToMailerLite(db, env, { fetcher });
  assert.equal(second.attempted, 0);
  assert.deepEqual(await getMailerLiteSyncStatus(db), { lastSyncedAt: '2026-11-24T00:00:00.000Z', failed: 0, pending: 0 });
});

test('records failures and retries them later', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const failing = recorder(422);
  const result = await syncRegistrationsToMailerLite(db, env, { fetcher: failing.fetcher });
  assert.deepEqual(result, { attempted: 1, synced: 0, failed: 1 });
  assert.deepEqual(await getMailerLiteSyncStatus(db), { lastSyncedAt: '', failed: 1, pending: 0 });

  const ok = recorder();
  const retry = await syncRegistrationsToMailerLite(db, env, { fetcher: ok.fetcher, now: new Date('2026-11-24T01:00:00Z') });
  assert.equal(retry.synced, 1);
  const state = db.sqlite.prepare('SELECT attempts, last_error FROM volunteer_registration_mailerlite').get() as any;
  assert.equal(state.attempts, 2);
  assert.equal(state.last_error, '');
});

test('a network error is recorded without throwing', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const result = await syncRegistrationsToMailerLite(db, env, {
    fetcher: async () => {
      throw new TypeError('network down');
    },
  });
  assert.deepEqual(result, { attempted: 1, synced: 0, failed: 1 });
});

test('a new registration from an already-synced email is sent again', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const { calls, fetcher } = recorder();
  await syncRegistrationsToMailerLite(db, env, { fetcher });
  insertRegistration(db, 2, 'a@example.com', 'Updated Person');
  assert.equal((await getMailerLiteSyncStatus(db)).pending, 1);
  await syncRegistrationsToMailerLite(db, env, { fetcher });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.fields.name, 'Updated');
});

test('a registration-triggered sync sends only that registration', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com', 'Backlog One');
  insertRegistration(db, 2, 'b@example.com', 'New Person');
  const { calls, fetcher } = recorder();
  const result = await syncRegistrationsToMailerLite(db, env, { fetcher, registrationId: 2, limit: 1 });
  assert.equal(result.synced, 1);
  assert.deepEqual(calls.map((call) => call.body.fields.name), ['New']);
  assert.equal((await getMailerLiteSyncStatus(db)).pending, 1);
});

test('failures keep retrying with no attempt cap', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const failing = recorder(401);
  for (let run = 0; run < 12; run += 1) await syncRegistrationsToMailerLite(db, env, { fetcher: failing.fetcher });
  const ok = recorder();
  assert.equal((await syncRegistrationsToMailerLite(db, env, { fetcher: ok.fetcher })).synced, 1);
});

test('a failed overlapping run does not undo an earlier success', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  await syncRegistrationsToMailerLite(db, env, { fetcher: recorder().fetcher, now: new Date('2026-11-24T00:00:00Z') });
  // Simulate a concurrent run that selected the row before the success was recorded, then failed.
  db.sqlite
    .prepare(
      `INSERT INTO volunteer_registration_mailerlite (registration_id, synced_at, attempts, last_error, last_attempt_at)
       VALUES (1, '', 1, 'HTTP 500', 'x')
       ON CONFLICT (registration_id) DO UPDATE SET
         synced_at = CASE WHEN volunteer_registration_mailerlite.synced_at <> '' THEN volunteer_registration_mailerlite.synced_at ELSE excluded.synced_at END,
         attempts = volunteer_registration_mailerlite.attempts + 1,
         last_error = CASE WHEN volunteer_registration_mailerlite.synced_at <> '' THEN '' ELSE excluded.last_error END`
    )
    .run();
  assert.deepEqual(await getMailerLiteSyncStatus(db), { lastSyncedAt: '2026-11-24T00:00:00.000Z', failed: 0, pending: 0 });
});

test('a failure superseded by a newer registration is not shown as failed', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  await syncRegistrationsToMailerLite(db, env, { fetcher: recorder(500).fetcher });
  insertRegistration(db, 2, 'a@example.com');
  await syncRegistrationsToMailerLite(db, env, { fetcher: recorder().fetcher });
  assert.equal((await getMailerLiteSyncStatus(db)).failed, 0);
});

test('an unsubscribed or bounced subscriber is left alone and not shown as failed', async () => {
  const db = database();
  insertRegistration(db, 1, 'a@example.com');
  const fetcher = async () => ({
    ok: false,
    status: 422,
    text: async () => '{"message":"The given data was invalid.","errors":{"email":["This subscriber is not active and cannot be imported"]}}',
  });
  const result = await syncRegistrationsToMailerLite(db, env, { fetcher, now: new Date('2026-11-24T00:00:00Z') });
  assert.equal(result.synced, 1);
  assert.deepEqual(await getMailerLiteSyncStatus(db), { lastSyncedAt: '2026-11-24T00:00:00.000Z', failed: 0, pending: 0 });
  const calls = recorder();
  await syncRegistrationsToMailerLite(db, env, { fetcher: calls.fetcher });
  assert.equal(calls.calls.length, 0);
});
