import type { APIRoute } from 'astro';
import {
  getAdelaideDate,
  validateVolunteerSignIn,
  type VolunteerSignInInput,
} from '../../lib/volunteerSignIn';

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

const MAX_BODY_BYTES = 10_000;
// Allow busy group arrivals on a shared device while still bounding automated abuse.
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 10 * 60 * 1000;
let schemaReady: Promise<void> | undefined;

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
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
      // Do not let a failed stream cancellation turn the intended 413 into a 400.
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
          `CREATE TABLE IF NOT EXISTS volunteer_sign_ins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            email_normalized TEXT NOT NULL,
            phone TEXT NOT NULL,
            phone_normalized TEXT NOT NULL,
            volunteer_date TEXT NOT NULL,
            communications_consent INTEGER NOT NULL DEFAULT 0
              CHECK (communications_consent IN (0, 1)),
            signed_in_at TEXT NOT NULL
          )`
        ),
        database.prepare(
          `CREATE UNIQUE INDEX IF NOT EXISTS volunteer_sign_ins_date_email
           ON volunteer_sign_ins (volunteer_date, email_normalized)`
        ),
        database.prepare(
          `CREATE UNIQUE INDEX IF NOT EXISTS volunteer_sign_ins_date_phone
           ON volunteer_sign_ins (volunteer_date, phone_normalized)`
        ),
        database.prepare(
          `CREATE TABLE IF NOT EXISTS volunteer_sign_in_rate_limits (
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
      `INSERT INTO volunteer_sign_in_rate_limits (client_key, window_started_at, request_count)
       VALUES (?1, ?2, 1)
       ON CONFLICT(client_key) DO UPDATE SET
         request_count = CASE
           WHEN volunteer_sign_in_rate_limits.window_started_at <= ?3 THEN 1
           ELSE volunteer_sign_in_rate_limits.request_count + 1
         END,
         window_started_at = CASE
           WHEN volunteer_sign_in_rate_limits.window_started_at <= ?3 THEN ?2
           ELSE volunteer_sign_in_rate_limits.window_started_at
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
    console.error('Volunteer sign-in D1 binding is unavailable');
    return jsonResponse(
      { ok: false, message: 'Sign-in is unavailable right now. Please let a Forktree team member know.' },
      503
    );
  }

  try {
    await ensureSchema(database);

    // Count every same-origin JSON request, including malformed and invalid submissions.
    // Limiting only validated entries would leave the endpoint open to request abuse.
    if (await isRateLimited(database, request)) {
      return jsonResponse(
        { ok: false, message: 'Too many sign-in attempts. Please wait a few minutes or let a Forktree team member know.' },
        429
      );
    }
  } catch (error) {
    console.error('Volunteer sign-in initialization failed', error);
    return jsonResponse(
      { ok: false, message: 'Sign-in is unavailable right now. Please let a Forktree team member know.' },
      503
    );
  }

  let input: Partial<VolunteerSignInInput>;
  try {
    const body = await readLimitedBody(request);
    if (body === null) {
      return jsonResponse({ ok: false, message: 'Invalid submission.' }, 413);
    }

    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse({ ok: false, message: 'Invalid submission.' }, 400);
    }
    input = parsed as Partial<VolunteerSignInInput>;
  } catch {
    return jsonResponse({ ok: false, message: 'Invalid submission.' }, 400);
  }

  // Honeypot field: bots often fill hidden fields that people never see.
  if (typeof input.website === 'string' && input.website.trim()) {
    return jsonResponse({ ok: true }, 201);
  }

  const today = getAdelaideDate();
  const validation = validateVolunteerSignIn(input, today);
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
    const duplicate = await database
      .prepare(
        `SELECT id
         FROM volunteer_sign_ins
         WHERE volunteer_date = ?1
           AND (email_normalized = ?2 OR phone_normalized = ?3)
         LIMIT 1`
      )
      .bind(entry.volunteerDate, entry.emailNormalized, entry.phoneNormalized)
      .first<{ id: number }>();

    if (duplicate) {
      return jsonResponse({ ok: false, code: 'duplicate', message: 'You’re already signed in today.' }, 409);
    }

    await database
      .prepare(
        `INSERT INTO volunteer_sign_ins (
          full_name,
          email,
          email_normalized,
          phone,
          phone_normalized,
          volunteer_date,
          communications_consent,
          signed_in_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
      )
      .bind(
        entry.fullName,
        entry.email,
        entry.emailNormalized,
        entry.phone,
        entry.phoneNormalized,
        entry.volunteerDate,
        entry.communicationsConsent ? 1 : 0,
        new Date().toISOString()
      )
      .run();

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/unique|constraint/i.test(message)) {
      return jsonResponse({ ok: false, code: 'duplicate', message: 'You’re already signed in today.' }, 409);
    }

    console.error('Volunteer sign-in failed', error);
    return jsonResponse(
      { ok: false, message: 'We couldn’t complete your sign-in. Please try again or let a Forktree team member know.' },
      500
    );
  }
};
