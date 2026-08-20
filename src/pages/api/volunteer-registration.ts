import type { APIRoute } from 'astro';
import {
  VOLUNTEER_REGISTRATION_FORM_VERSION,
  validateVolunteerRegistration,
  type VolunteerRegistrationInput,
} from '../../lib/volunteerRegistration';

export const prerender = false;

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

const MAX_BODY_BYTES = 50_000;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
let schemaReady: Promise<void> | undefined;

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

async function readLimitedBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_BODY_BYTES) {
      void reader.cancel().catch(() => undefined);
      return null;
    }

    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function ensureSchema(database: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = database
      .batch([
        database.prepare(
          `CREATE TABLE IF NOT EXISTS volunteer_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            preferred_name TEXT NOT NULL,
            is_under_18 INTEGER NOT NULL CHECK (is_under_18 IN (0, 1)),
            date_of_birth TEXT NOT NULL,
            address TEXT NOT NULL,
            phone TEXT NOT NULL,
            phone_normalized TEXT NOT NULL,
            email TEXT NOT NULL,
            email_normalized TEXT NOT NULL,
            referral_sources_json TEXT NOT NULL,
            referral_other TEXT NOT NULL,
            emergency_contact_name TEXT NOT NULL,
            emergency_contact_relationship TEXT NOT NULL,
            emergency_contact_phone TEXT NOT NULL,
            emergency_contact_phone_normalized TEXT NOT NULL,
            interests_json TEXT NOT NULL,
            interest_other TEXT NOT NULL,
            skills_experience TEXT NOT NULL,
            qualifications_json TEXT NOT NULL,
            licences_json TEXT NOT NULL,
            licence_other TEXT NOT NULL,
            wwcc_status TEXT NOT NULL CHECK (wwcc_status IN ('', 'yes', 'no', 'applied')),
            wwcc_number TEXT NOT NULL,
            wwcc_expiry_date TEXT NOT NULL,
            frequency TEXT NOT NULL CHECK (
              frequency IN ('weekly', 'fortnightly', 'monthly', 'occasionally', 'community-planting-days')
            ),
            preferred_days_json TEXT NOT NULL,
            accessibility_support TEXT NOT NULL,
            medical_information TEXT NOT NULL,
            media_consent TEXT NOT NULL CHECK (media_consent IN ('consent', 'decline')),
            declaration_name TEXT NOT NULL,
            agreement_accepted INTEGER NOT NULL CHECK (agreement_accepted = 1),
            form_version TEXT NOT NULL,
            registered_at TEXT NOT NULL
          )`
        ),
        database.prepare(
          `CREATE INDEX IF NOT EXISTS volunteer_registrations_email
           ON volunteer_registrations (email_normalized)`
        ),
        database.prepare(
          `CREATE INDEX IF NOT EXISTS volunteer_registrations_phone
           ON volunteer_registrations (phone_normalized)`
        ),
        database.prepare(
          `CREATE INDEX IF NOT EXISTS volunteer_registrations_registered_at
           ON volunteer_registrations (registered_at)`
        ),
        database.prepare(
          `CREATE TABLE IF NOT EXISTS volunteer_registration_rate_limits (
            client_key TEXT PRIMARY KEY,
            window_started_at INTEGER NOT NULL,
            request_count INTEGER NOT NULL
          )`
        ),
      ])
      .then(() => undefined)
      .catch((error) => {
        schemaReady = undefined;
        throw error;
      });
  }

  return schemaReady;
}

async function getClientKey(request: Request): Promise<string> {
  const clientAddress = request.headers.get('cf-connecting-ip') || 'unknown-client';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function isRateLimited(database: D1Database, request: Request): Promise<boolean> {
  const now = Date.now();
  const windowCutoff = now - RATE_WINDOW_MS;
  const result = await database
    .prepare(
      `INSERT INTO volunteer_registration_rate_limits (client_key, window_started_at, request_count)
       VALUES (?1, ?2, 1)
       ON CONFLICT(client_key) DO UPDATE SET
         request_count = CASE
           WHEN volunteer_registration_rate_limits.window_started_at <= ?3 THEN 1
           ELSE volunteer_registration_rate_limits.request_count + 1
         END,
         window_started_at = CASE
           WHEN volunteer_registration_rate_limits.window_started_at <= ?3 THEN ?2
           ELSE volunteer_registration_rate_limits.window_started_at
         END
       RETURNING request_count`
    )
    .bind(await getClientKey(request), now, windowCutoff)
    .first<{ request_count: number }>();

  return Boolean(result && result.request_count > RATE_LIMIT);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ ok: false, message: 'Invalid submission.' }, 415);
  }

  const origin = request.headers.get('origin');
  try {
    if (origin && new URL(origin).origin !== new URL(request.url).origin) {
      return jsonResponse({ ok: false, message: 'Invalid submission.' }, 403);
    }
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid submission.' }, 403);
  }

  const database = (locals as any).runtime?.env?.VOLUNTEER_SIGN_INS as D1Database | undefined;
  if (!database) {
    console.error('Volunteer registration D1 binding is unavailable');
    return jsonResponse(
      {
        ok: false,
        message: 'Registration is unavailable right now. Please try again later or email The Forktree Project.',
      },
      503
    );
  }

  try {
    await ensureSchema(database);

    // Count every same-origin JSON request so malformed submissions cannot bypass the limit.
    if (await isRateLimited(database, request)) {
      return jsonResponse(
        {
          ok: false,
          message: 'Too many registration attempts. Please wait a few minutes before trying again.',
        },
        429
      );
    }
  } catch (error) {
    console.error('Volunteer registration initialization failed', error);
    return jsonResponse(
      {
        ok: false,
        message: 'Registration is unavailable right now. Please try again later or email The Forktree Project.',
      },
      503
    );
  }

  let input: Partial<VolunteerRegistrationInput>;
  try {
    const body = await readLimitedBody(request);
    if (body === null) return jsonResponse({ ok: false, message: 'Invalid submission.' }, 413);

    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ ok: false, message: 'Invalid submission.' }, 400);
    }
    input = parsed as Partial<VolunteerRegistrationInput>;
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid submission.' }, 400);
  }

  // Bots often fill hidden fields that people never see. Return success without storing anything.
  if (typeof input.website === 'string' && input.website.trim()) {
    return jsonResponse({ ok: true }, 201);
  }

  const validation = validateVolunteerRegistration(input);
  if (!validation.success) {
    return jsonResponse(
      {
        ok: false,
        message: 'Check the highlighted fields and try again.',
        errors: validation.errors,
      },
      400
    );
  }

  const entry = validation.data;

  try {
    await database
      .prepare(
        `INSERT INTO volunteer_registrations (
          full_name,
          preferred_name,
          is_under_18,
          date_of_birth,
          address,
          phone,
          phone_normalized,
          email,
          email_normalized,
          referral_sources_json,
          referral_other,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone,
          emergency_contact_phone_normalized,
          interests_json,
          interest_other,
          skills_experience,
          qualifications_json,
          licences_json,
          licence_other,
          wwcc_status,
          wwcc_number,
          wwcc_expiry_date,
          frequency,
          preferred_days_json,
          accessibility_support,
          medical_information,
          media_consent,
          declaration_name,
          agreement_accepted,
          form_version,
          registered_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
          ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16,
          ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24,
          ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32,
          ?33
        )`
      )
      .bind(
        entry.fullName,
        entry.preferredName,
        entry.isUnder18 ? 1 : 0,
        entry.dateOfBirth,
        entry.address,
        entry.phone,
        entry.phoneNormalized,
        entry.email,
        entry.emailNormalized,
        JSON.stringify(entry.referralSources),
        entry.referralOther,
        entry.emergencyContactName,
        entry.emergencyContactRelationship,
        entry.emergencyContactPhone,
        entry.emergencyContactPhoneNormalized,
        JSON.stringify(entry.interests),
        entry.interestOther,
        entry.skillsExperience,
        JSON.stringify(entry.qualifications),
        JSON.stringify(entry.licences),
        entry.licenceOther,
        entry.wwccStatus,
        entry.wwccNumber,
        entry.wwccExpiryDate,
        entry.frequency,
        JSON.stringify(entry.preferredDays),
        entry.accessibilitySupport,
        entry.medicalInformation,
        entry.mediaConsent,
        entry.declarationName,
        1,
        VOLUNTEER_REGISTRATION_FORM_VERSION,
        new Date().toISOString()
      )
      .run();

    return jsonResponse({ ok: true }, 201);
  } catch {
    // Do not pass the driver error object to logs: it followed a statement bound with sensitive data.
    console.error('Volunteer registration insert failed');
    return jsonResponse(
      {
        ok: false,
        message: 'We couldn’t submit your registration. Please try again or email The Forktree Project.',
      },
      500
    );
  }
};
