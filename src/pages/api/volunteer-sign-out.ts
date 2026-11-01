import type { APIRoute } from 'astro';
import {
  getAdelaideDate,
  validateVolunteerSignOut,
  type VolunteerSignOutInput,
} from '../../lib/volunteerSignIn';
import { ensureVolunteerSchema, getVolunteerDatabase } from '../../lib/volunteerDb';
import {
  isRateLimited,
  jsonResponse,
  readJsonObject,
  rejectInvalidJsonRequest,
} from '../../lib/volunteerApi';

export const prerender = false;

const UNAVAILABLE = 'Sign-out is unavailable right now. Please let a Forktree team member know.';

interface TodaySignIn {
  id: number;
  full_name: string;
  preferred_name: string | null;
  has_attendance: number;
  signed_out_at: string | null;
  sign_out_method: string | null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const invalid = rejectInvalidJsonRequest(request);
  if (invalid) return invalid;

  const database = getVolunteerDatabase(locals);
  if (!database) {
    console.error('Volunteer sign-out D1 binding is unavailable');
    return jsonResponse({ ok: false, message: UNAVAILABLE }, 503);
  }

  try {
    await ensureVolunteerSchema(database);
    if (await isRateLimited(database, request)) {
      return jsonResponse(
        { ok: false, message: 'Too many attempts. Please wait a few minutes or let a Forktree team member know.' },
        429
      );
    }
  } catch (error) {
    console.error('Volunteer sign-out initialization failed', error);
    return jsonResponse({ ok: false, message: UNAVAILABLE }, 503);
  }

  const parsed = await readJsonObject<VolunteerSignOutInput>(request);
  if ('response' in parsed) return parsed.response;
  const input = parsed.input;

  if (typeof input.website === 'string' && input.website.trim()) {
    return jsonResponse({ ok: true }, 200);
  }

  const validation = validateVolunteerSignOut(input);
  if (!validation.success) {
    return jsonResponse(
      { ok: false, message: 'Check the highlighted fields and try again.', errors: validation.errors },
      400
    );
  }

  try {
    const signIn = await database
      .prepare(
        `SELECT s.id, s.full_name, v.preferred_name,
          CASE WHEN a.sign_in_id IS NULL THEN 0 ELSE 1 END AS has_attendance,
          a.signed_out_at, a.sign_out_method
         FROM volunteer_sign_ins s
         LEFT JOIN volunteer_attendance a ON a.sign_in_id = s.id
         LEFT JOIN volunteers v ON v.id = a.volunteer_id
         WHERE s.volunteer_date = ?1 AND s.phone_normalized = ?2
         LIMIT 1`
      )
      .bind(getAdelaideDate(), validation.phoneNormalized)
      .first<TodaySignIn>();

    if (!signIn) {
      return jsonResponse(
        {
          ok: false,
          code: 'not-signed-in',
          message: 'We couldn’t find a sign-in for today with that phone number. Check the number, or let a Forktree team member know.',
          errors: { phone: 'No sign-in found for today with this number.' },
        },
        404
      );
    }

    const name = signIn.preferred_name || signIn.full_name.split(' ')[0] || signIn.full_name;

    if (signIn.signed_out_at && signIn.sign_out_method === 'confirmed') {
      return jsonResponse({ ok: false, code: 'already-signed-out', message: 'You’ve already signed out today. Thanks!' }, 409);
    }

    // A confirmed sign-out replaces an automatic one, e.g. someone who stayed past 5pm.
    const now = new Date().toISOString();
    await database
      .prepare(
        signIn.has_attendance
          ? `UPDATE volunteer_attendance SET signed_out_at = ?2, sign_out_method = 'confirmed' WHERE sign_in_id = ?1`
          : `INSERT INTO volunteer_attendance (sign_in_id, signed_out_at, sign_out_method) VALUES (?1, ?2, 'confirmed')`
      )
      .bind(signIn.id, now)
      .run();

    return jsonResponse({ ok: true, name }, 200);
  } catch (error) {
    console.error('Volunteer sign-out failed', error);
    return jsonResponse(
      { ok: false, message: 'We couldn’t complete your sign-out. Please try again or let a Forktree team member know.' },
      500
    );
  }
};
