import type { APIRoute } from 'astro';
import {
  VOLUNTEER_INTERESTS,
  VOLUNTEERING_FREQUENCIES,
  WEEKDAYS,
} from '../../lib/volunteerRegistration';
import { getAdelaideDate } from '../../lib/volunteerSignIn';
import {
  buildRegistrationCsv,
  type RegistrationExportRow,
} from '../../lib/registrationCsv';
import type { D1Database } from '../../lib/admin';

export const prerender = false;

const labels = {
  interests: new Map<string, string>(VOLUNTEER_INTERESTS.map(({ value, label }) => [value, label])),
  frequencies: new Map<string, string>(VOLUNTEERING_FREQUENCIES.map(({ value, label }) => [value, label])),
  weekdays: new Map<string, string>(WEEKDAYS.map(({ value, label }) => [value, label])),
};

function unavailableResponse(): Response {
  return new Response('Registration export is unavailable. Please try again later.', {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const database = (locals as any).runtime?.env?.VOLUNTEER_SIGN_INS as D1Database | undefined;
  if (!database) return unavailableResponse();

  try {
    const result = await database
      .prepare(
        `WITH ranked_registrations AS (
          SELECT
            id, email, full_name, preferred_name, phone, is_under_18, interests_json,
            interest_other, frequency, preferred_days_json, registered_at,
            ROW_NUMBER() OVER (
              PARTITION BY email_normalized
              ORDER BY registered_at DESC, id DESC
            ) AS email_rank
          FROM volunteer_registrations
          WHERE trim(email) <> ''
            AND trim(email_normalized) <> ''
        )
        SELECT
          id, email, full_name, preferred_name, phone, is_under_18, interests_json,
          interest_other, frequency, preferred_days_json, registered_at
        FROM ranked_registrations
        WHERE email_rank = 1
        ORDER BY registered_at DESC, id DESC`
      )
      .all<RegistrationExportRow>();

    const csv = buildRegistrationCsv(result.results || [], labels);
    const filename = `forktree-volunteer-registrations-${getAdelaideDate()}.csv`;

    return new Response(csv, {
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `attachment; filename="${filename}"`,
        'content-type': 'text/csv; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    console.error('Unable to export volunteer registrations');
    return unavailableResponse();
  }
};
