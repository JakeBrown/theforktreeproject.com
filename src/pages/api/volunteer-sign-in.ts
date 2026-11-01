import type { APIRoute } from 'astro';
import {
  getAdelaideDate,
  validateVolunteerSignIn,
  type VolunteerSignInInput,
} from '../../lib/volunteerSignIn';
import { SIGN_IN_DECLARATION_VERSION } from '../../lib/volunteerAttendance';
import { ensureVolunteerSchema, getVolunteerDatabase } from '../../lib/volunteerDb';
import {
  isRateLimited,
  jsonResponse,
  readJsonObject,
  rejectInvalidJsonRequest,
} from '../../lib/volunteerApi';

export const prerender = false;

const UNAVAILABLE = 'Sign-in is unavailable right now. Please let a Forktree team member know.';
const DUPLICATE = {
  ok: false,
  code: 'duplicate',
  message: 'You’re already signed in today. Heading home? Switch to “Sign out” instead.',
};

export const POST: APIRoute = async ({ request, locals }) => {
  const invalid = rejectInvalidJsonRequest(request);
  if (invalid) return invalid;

  const database = getVolunteerDatabase(locals);
  if (!database) {
    console.error('Volunteer sign-in D1 binding is unavailable');
    return jsonResponse({ ok: false, message: UNAVAILABLE }, 503);
  }

  try {
    await ensureVolunteerSchema(database);
    // Count every same-origin JSON request, including malformed and invalid submissions.
    if (await isRateLimited(database, request)) {
      return jsonResponse(
        { ok: false, message: 'Too many attempts. Please wait a few minutes or let a Forktree team member know.' },
        429
      );
    }
  } catch (error) {
    console.error('Volunteer sign-in initialization failed', error);
    return jsonResponse({ ok: false, message: UNAVAILABLE }, 503);
  }

  const parsed = await readJsonObject<VolunteerSignInInput>(request);
  if ('response' in parsed) return parsed.response;
  const input = parsed.input;

  // Honeypot field: bots often fill hidden fields that people never see.
  if (typeof input.website === 'string' && input.website.trim()) {
    return jsonResponse({ ok: true }, 201);
  }

  const validation = validateVolunteerSignIn(input, getAdelaideDate());
  if (!validation.success) {
    return jsonResponse(
      { ok: false, message: 'Check the highlighted fields and try again.', errors: validation.errors },
      400
    );
  }

  const entry = validation.data;

  try {
    const duplicate = await database
      .prepare('SELECT id FROM volunteer_sign_ins WHERE volunteer_date = ?1 AND phone_normalized = ?2 LIMIT 1')
      .bind(entry.volunteerDate, entry.phoneNormalized)
      .first<{ id: number }>();
    if (duplicate) return jsonResponse(DUPLICATE, 409);

    const now = new Date().toISOString();
    const inserted = await database
      .prepare(
        `INSERT INTO volunteer_sign_ins (
          full_name, email, email_normalized, phone, phone_normalized,
          volunteer_date, communications_consent, signed_in_at
        ) VALUES (?1, '', '', ?2, ?3, ?4, 0, ?5)
        RETURNING id`
      )
      .bind(entry.fullName, entry.phone, entry.phoneNormalized, entry.volunteerDate, now)
      .first<{ id: number }>();

    if (inserted) {
      try {
        await recordAttendance(database, inserted.id, entry, now);
      } catch (error) {
        // The sign-in itself is saved; the profile link is repaired on the next admin sync.
        console.error('Volunteer attendance link failed', error);
      }
    }

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|constraint/i.test(message)) return jsonResponse(DUPLICATE, 409);

    console.error('Volunteer sign-in failed', error);
    return jsonResponse(
      { ok: false, message: 'We couldn’t complete your sign-in. Please try again or let a Forktree team member know.' },
      500
    );
  }
};

async function recordAttendance(
  database: NonNullable<ReturnType<typeof getVolunteerDatabase>>,
  signInId: number,
  entry: { fullName: string; phone: string; phoneNormalized: string },
  now: string
): Promise<void> {
  let volunteer = await database
    .prepare('SELECT id FROM volunteers WHERE phone_normalized = ?1 ORDER BY id ASC LIMIT 1')
    .bind(entry.phoneNormalized)
    .first<{ id: number }>();

  if (!volunteer) {
    volunteer = await database
      .prepare(
        `INSERT INTO volunteers (full_name, phone, phone_normalized, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id`
      )
      .bind(entry.fullName, entry.phone, entry.phoneNormalized, now)
      .first<{ id: number }>();
  }

  await database
    .prepare(
      `INSERT INTO volunteer_attendance (sign_in_id, volunteer_id, declaration_version, declaration_accepted_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(sign_in_id) DO UPDATE SET
         volunteer_id = COALESCE(volunteer_attendance.volunteer_id, excluded.volunteer_id),
         declaration_version = excluded.declaration_version,
         declaration_accepted_at = excluded.declaration_accepted_at`
    )
    .bind(signInId, volunteer?.id ?? null, SIGN_IN_DECLARATION_VERSION, now)
    .run();
}
