import { automaticSignOutAt, getAdelaideDate } from './volunteerAttendance.ts';

export interface D1Result<T> {
  results?: T[];
  meta?: { last_row_id?: number; changes?: number };
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

export function getVolunteerDatabase(locals: unknown): D1Database | undefined {
  return (locals as any)?.runtime?.env?.VOLUNTEER_SIGN_INS as D1Database | undefined;
}

/**
 * Every statement is idempotent so the schema can be applied at runtime (the deploy does not run
 * D1 migrations) and by `migrations/0004_volunteer_profiles_and_attendance.sql`. New sign-in data
 * lives in side tables keyed by sign-in id so the existing table never needs an ALTER.
 */
export const VOLUNTEER_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS volunteer_sign_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_normalized TEXT NOT NULL,
    volunteer_date TEXT NOT NULL,
    communications_consent INTEGER NOT NULL DEFAULT 0 CHECK (communications_consent IN (0, 1)),
    signed_in_at TEXT NOT NULL
  )`,
  'DROP INDEX IF EXISTS volunteer_sign_ins_date_email',
  `CREATE UNIQUE INDEX IF NOT EXISTS volunteer_sign_ins_date_phone
    ON volunteer_sign_ins (volunteer_date, phone_normalized)`,
  `CREATE TABLE IF NOT EXISTS volunteer_sign_in_rate_limits (
    client_key TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    preferred_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    phone_normalized TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    emergency_contact_name TEXT NOT NULL DEFAULT '',
    emergency_contact_relationship TEXT NOT NULL DEFAULT '',
    emergency_contact_phone TEXT NOT NULL DEFAULT '',
    secondary_emergency_contact_name TEXT NOT NULL DEFAULT '',
    secondary_emergency_contact_relationship TEXT NOT NULL DEFAULT '',
    secondary_emergency_contact_phone TEXT NOT NULL DEFAULT '',
    support_needs TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    registration_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS volunteers_phone ON volunteers (phone_normalized)`,
  `CREATE INDEX IF NOT EXISTS volunteers_name ON volunteers (full_name COLLATE NOCASE)`,
  `CREATE TABLE IF NOT EXISTS volunteer_photos (
    volunteer_id INTEGER PRIMARY KEY,
    content_type TEXT NOT NULL,
    data BLOB NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS volunteer_attendance (
    sign_in_id INTEGER PRIMARY KEY,
    volunteer_id INTEGER,
    declaration_version TEXT NOT NULL DEFAULT '',
    declaration_accepted_at TEXT NOT NULL DEFAULT '',
    signed_out_at TEXT NOT NULL DEFAULT '',
    sign_out_method TEXT NOT NULL DEFAULT '' CHECK (sign_out_method IN ('', 'confirmed', 'automatic'))
  )`,
  `CREATE INDEX IF NOT EXISTS volunteer_attendance_volunteer ON volunteer_attendance (volunteer_id)`,
  `CREATE INDEX IF NOT EXISTS volunteer_attendance_open ON volunteer_attendance (signed_out_at)`,
  `CREATE TABLE IF NOT EXISTS volunteer_scheduled_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volunteer_id INTEGER NOT NULL,
    visit_date TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS volunteer_scheduled_visits_date ON volunteer_scheduled_visits (visit_date)`,
  `CREATE INDEX IF NOT EXISTS volunteer_scheduled_visits_volunteer ON volunteer_scheduled_visits (volunteer_id)`,
  `CREATE TABLE IF NOT EXISTS volunteer_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
];

const schemaReady = new WeakMap<D1Database, Promise<void>>();

export function ensureVolunteerSchema(database: D1Database): Promise<void> {
  let ready = schemaReady.get(database);
  if (!ready) {
    ready = database
      .batch(VOLUNTEER_SCHEMA_STATEMENTS.map((statement) => database.prepare(statement)))
      .then(() => undefined)
      .catch((error) => {
        schemaReady.delete(database);
        throw error;
      });
    schemaReady.set(database, ready);
  }
  return ready;
}

async function registrationsTableExists(database: D1Database): Promise<boolean> {
  const row = await database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'volunteer_registrations'")
    .first<{ name: string }>();
  return Boolean(row);
}

/**
 * Create and link volunteer profiles from sign-ins and registration forms. Idempotent: run before
 * any admin view or feed so new sign-ins and registrations always have a profile.
 */
export async function syncVolunteerProfiles(database: D1Database, now = new Date()): Promise<void> {
  await ensureVolunteerSchema(database);
  const timestamp = now.toISOString();
  const hasRegistrations = await registrationsTableExists(database);
  const statements: D1Statement[] = [];

  if (hasRegistrations) {
    // One profile per registration phone number, unless a profile already has that phone or registration.
    statements.push(
      database
        .prepare(
          `INSERT INTO volunteers (
            full_name, preferred_name, phone, phone_normalized, email, address,
            emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
            support_needs, registration_id, created_at, updated_at
          )
          SELECT r.full_name, r.preferred_name, r.phone, r.phone_normalized, r.email, r.address,
            r.emergency_contact_name, r.emergency_contact_relationship, r.emergency_contact_phone,
            TRIM(r.accessibility_support || CASE WHEN r.accessibility_support <> '' AND r.medical_information <> '' THEN char(10) ELSE '' END || r.medical_information),
            r.id, ?1, ?1
          FROM volunteer_registrations r
          WHERE r.phone_normalized <> ''
            AND r.id = (SELECT MAX(r2.id) FROM volunteer_registrations r2 WHERE r2.phone_normalized = r.phone_normalized)
            AND NOT EXISTS (SELECT 1 FROM volunteers v WHERE v.phone_normalized = r.phone_normalized)
            AND NOT EXISTS (
              SELECT 1 FROM volunteers v JOIN volunteer_registrations r3 ON r3.id = v.registration_id
              WHERE r3.phone_normalized = r.phone_normalized
            )`
        )
        .bind(timestamp)
    );
    // Link existing profiles to their newest registration and fill any blank details from it.
    statements.push(
      database.prepare(
        `UPDATE volunteers SET registration_id = (
          SELECT MAX(r.id) FROM volunteer_registrations r WHERE r.phone_normalized = volunteers.phone_normalized
        )
        WHERE registration_id IS NULL AND phone_normalized <> ''
          AND EXISTS (SELECT 1 FROM volunteer_registrations r WHERE r.phone_normalized = volunteers.phone_normalized)`
      )
    );
    statements.push(
      database.prepare(
        `UPDATE volunteers SET
          preferred_name = CASE WHEN preferred_name = '' THEN (SELECT preferred_name FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE preferred_name END,
          email = CASE WHEN email = '' THEN (SELECT email FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE email END,
          address = CASE WHEN address = '' THEN (SELECT address FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE address END,
          emergency_contact_name = CASE WHEN emergency_contact_name = '' THEN (SELECT emergency_contact_name FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE emergency_contact_name END,
          emergency_contact_relationship = CASE WHEN emergency_contact_relationship = '' THEN (SELECT emergency_contact_relationship FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE emergency_contact_relationship END,
          emergency_contact_phone = CASE WHEN emergency_contact_phone = '' THEN (SELECT emergency_contact_phone FROM volunteer_registrations WHERE id = volunteers.registration_id) ELSE emergency_contact_phone END
        WHERE registration_id IS NOT NULL
          AND (preferred_name = '' OR email = '' OR address = '' OR emergency_contact_name = ''
            OR emergency_contact_relationship = '' OR emergency_contact_phone = '')
          AND EXISTS (SELECT 1 FROM volunteer_registrations WHERE id = volunteers.registration_id)`
      )
    );
  }

  // Give every sign-in an attendance row, linked to the profile with the same phone number.
  statements.push(
    database.prepare(
      `INSERT INTO volunteer_attendance (sign_in_id, volunteer_id)
       SELECT s.id, (SELECT MIN(v.id) FROM volunteers v WHERE v.phone_normalized = s.phone_normalized AND v.phone_normalized <> '')
       FROM volunteer_sign_ins s
       WHERE NOT EXISTS (SELECT 1 FROM volunteer_attendance a WHERE a.sign_in_id = s.id)`
    )
  );
  statements.push(
    database.prepare(
      `UPDATE volunteer_attendance SET volunteer_id = (
        SELECT MIN(v.id) FROM volunteers v JOIN volunteer_sign_ins s ON s.phone_normalized = v.phone_normalized
        WHERE s.id = volunteer_attendance.sign_in_id AND v.phone_normalized <> ''
      )
      WHERE volunteer_id IS NULL`
    )
  );
  // Sign-ins that still have no profile get one, named from their newest sign-in.
  statements.push(
    database
      .prepare(
        `INSERT INTO volunteers (full_name, phone, phone_normalized, created_at, updated_at)
         SELECT s.full_name, s.phone, s.phone_normalized, ?1, ?1
         FROM volunteer_sign_ins s
         JOIN volunteer_attendance a ON a.sign_in_id = s.id
         WHERE a.volunteer_id IS NULL
           AND s.id = (
             SELECT MAX(s2.id) FROM volunteer_sign_ins s2
             JOIN volunteer_attendance a2 ON a2.sign_in_id = s2.id
             WHERE s2.phone_normalized = s.phone_normalized AND a2.volunteer_id IS NULL
           )`
      )
      .bind(timestamp)
  );
  statements.push(
    database.prepare(
      `UPDATE volunteer_attendance SET volunteer_id = (
        SELECT MIN(v.id) FROM volunteers v JOIN volunteer_sign_ins s ON s.phone_normalized = v.phone_normalized
        WHERE s.id = volunteer_attendance.sign_in_id AND v.phone_normalized <> ''
      )
      WHERE volunteer_id IS NULL`
    )
  );

  await database.batch(statements);
}

interface OpenSignIn {
  id: number;
  volunteer_date: string;
  signed_in_at: string;
}

/**
 * Close sign-ins nobody confirmed leaving: at 5pm Adelaide time on the day (or end of day for
 * sign-ins after 5pm). Marked `automatic` so admins can tell them from confirmed departures.
 * Runs from the cron and before every read, so the records are right even if a cron run is missed.
 */
export async function applyAutomaticSignOuts(database: D1Database, now = new Date()): Promise<number> {
  const today = getAdelaideDate(now);
  const result = await database
    .prepare(
      `SELECT s.id, s.volunteer_date, s.signed_in_at
       FROM volunteer_sign_ins s
       JOIN volunteer_attendance a ON a.sign_in_id = s.id
       WHERE a.signed_out_at = '' AND s.volunteer_date <= ?1`
    )
    .bind(today)
    .all<OpenSignIn>();

  const updates = (result.results || [])
    .map((row) => ({ id: row.id, signOutAt: automaticSignOutAt(row.volunteer_date, row.signed_in_at) }))
    .filter((row) => row.signOutAt.getTime() <= now.getTime())
    .map((row) =>
      database
        .prepare(
          `UPDATE volunteer_attendance SET signed_out_at = ?1, sign_out_method = 'automatic'
           WHERE sign_in_id = ?2 AND signed_out_at = ''`
        )
        .bind(row.signOutAt.toISOString(), row.id)
    );

  for (let index = 0; index < updates.length; index += 50) {
    await database.batch(updates.slice(index, index + 50));
  }
  return updates.length;
}

/** Bring profiles and sign-outs up to date. Call before reading attendance. */
export async function refreshVolunteerRecords(database: D1Database, now = new Date()): Promise<void> {
  await syncVolunteerProfiles(database, now);
  await applyAutomaticSignOuts(database, now);
}

export interface VolunteerProfile {
  id: number;
  full_name: string;
  preferred_name: string;
  phone: string;
  phone_normalized: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  secondary_emergency_contact_name: string;
  secondary_emergency_contact_relationship: string;
  secondary_emergency_contact_phone: string;
  support_needs: string;
  notes: string;
  registration_id: number | null;
  created_at: string;
  updated_at: string;
}

export const VOLUNTEER_PROFILE_COLUMNS = `v.id, v.full_name, v.preferred_name, v.phone, v.phone_normalized, v.email, v.address,
  v.emergency_contact_name, v.emergency_contact_relationship, v.emergency_contact_phone,
  v.secondary_emergency_contact_name, v.secondary_emergency_contact_relationship, v.secondary_emergency_contact_phone,
  v.support_needs, v.notes, v.registration_id, v.created_at, v.updated_at`;

const CALENDAR_TOKEN_KEY = 'calendar_feed_token';

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getCalendarToken(database: D1Database): Promise<string> {
  await ensureVolunteerSchema(database);
  const row = await database
    .prepare('SELECT value FROM volunteer_settings WHERE key = ?1')
    .bind(CALENDAR_TOKEN_KEY)
    .first<{ value: string }>();
  return row?.value || '';
}

/** Create or replace the secret in the calendar subscription link. Replacing it breaks old links. */
export async function resetCalendarToken(database: D1Database): Promise<string> {
  await ensureVolunteerSchema(database);
  const token = randomToken();
  await database
    .prepare(
      `INSERT INTO volunteer_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(CALENDAR_TOKEN_KEY, token, new Date().toISOString())
    .run();
  return token;
}

export function tokensMatch(expected: string, provided: string): boolean {
  if (!expected || expected.length !== provided.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return difference === 0;
}
