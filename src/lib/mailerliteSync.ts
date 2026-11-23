/**
 * Copies volunteer registrations into MailerLite as subscribers in the "Volunteers" group.
 *
 * Runs right after each registration (in the background, so the form never waits on MailerLite)
 * and from the twice-daily volunteer cron, which retries anything that failed. Only the newest
 * registration per email is sent. Existing subscribers are updated in place; MailerLite never
 * resubscribes someone who unsubscribed because no status is sent.
 */
import { VOLUNTEER_INTERESTS, VOLUNTEERING_FREQUENCIES, WEEKDAYS } from './volunteerRegistration.ts';
import { getAdelaideDate } from './volunteerSignIn.ts';
import { ensureVolunteerSchema, type D1Database } from './volunteerDb.ts';

export interface MailerLiteEnv {
  MAILERLITE_API_KEY?: string;
  MAILERLITE_VOLUNTEERS_GROUP_ID?: string;
}

export interface MailerLiteRegistrationRow {
  id: number;
  full_name: string;
  preferred_name: string;
  is_under_18: number;
  phone: string;
  email: string;
  interests_json: string;
  interest_other: string;
  frequency: string;
  preferred_days_json: string;
  registered_at: string;
}

export interface MailerLiteSubscriberPayload {
  email: string;
  fields: Record<string, string>;
  groups: string[];
}

export interface MailerLiteSyncResult {
  attempted: number;
  synced: number;
  failed: number;
  skipped?: string;
}

type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const API_URL = 'https://connect.mailerlite.com/api/subscribers';
const REQUEST_TIMEOUT_MS = 10_000;

const interestLabels = new Map<string, string>(VOLUNTEER_INTERESTS.map(({ value, label }) => [value, label]));
const frequencyLabels = new Map<string, string>(VOLUNTEERING_FREQUENCIES.map(({ value, label }) => [value, label]));
const weekdayLabels = new Map<string, string>(WEEKDAYS.map(({ value, label }) => [value, label]));

function labelList(json: string, labels: ReadonlyMap<string, string>): string[] {
  try {
    const parsed: unknown = JSON.parse(json || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').map((item) => labels.get(item) || item);
  } catch {
    return [];
  }
}

export function buildMailerLiteSubscriber(row: MailerLiteRegistrationRow, groupId: string): MailerLiteSubscriberPayload {
  const [firstName = '', ...rest] = row.full_name.trim().split(/\s+/);
  const interests = labelList(row.interests_json, interestLabels).filter((label) => label !== 'Other');
  if (row.interest_other.trim()) interests.push(`Other: ${row.interest_other.trim()}`);
  const registeredDate = new Date(row.registered_at);

  return {
    email: row.email.trim(),
    fields: {
      name: firstName,
      last_name: rest.join(' '),
      preferred_name: row.preferred_name.trim(),
      phone: row.phone.trim(),
      under_18: row.is_under_18 ? 'Yes' : 'No',
      volunteer_interests: interests.join(', '),
      volunteer_frequency: frequencyLabels.get(row.frequency) || row.frequency,
      preferred_days: labelList(row.preferred_days_json, weekdayLabels).join(', '),
      volunteer_registered: Number.isNaN(registeredDate.getTime()) ? '' : getAdelaideDate(registeredDate),
    },
    groups: [groupId],
  };
}

/** Sync registrations that MailerLite has not received yet. Never throws. */
export async function syncRegistrationsToMailerLite(
  database: D1Database,
  env: MailerLiteEnv,
  options: { limit?: number; registrationId?: number; fetcher?: FetchLike; now?: Date } = {},
): Promise<MailerLiteSyncResult> {
  const apiKey = (env.MAILERLITE_API_KEY || '').trim();
  const groupId = (env.MAILERLITE_VOLUNTEERS_GROUP_ID || '').trim();
  if (!apiKey || !groupId) return { attempted: 0, synced: 0, failed: 0, skipped: 'not configured' };

  const fetcher: FetchLike = options.fetcher ?? ((input, init) => fetch(input, init));
  const result: MailerLiteSyncResult = { attempted: 0, synced: 0, failed: 0 };

  try {
    await ensureVolunteerSchema(database);
    const pending = await database
      .prepare(
        `SELECT r.id, r.full_name, r.preferred_name, r.is_under_18, r.phone, r.email, r.interests_json,
          r.interest_other, r.frequency, r.preferred_days_json, r.registered_at
         FROM volunteer_registrations r
         LEFT JOIN volunteer_registration_mailerlite m ON m.registration_id = r.id
         WHERE r.email_normalized <> ''
           AND r.id = (SELECT MAX(r2.id) FROM volunteer_registrations r2 WHERE r2.email_normalized = r.email_normalized)
           AND (m.registration_id IS NULL OR m.synced_at = '')
           AND (?1 IS NULL OR r.id = ?1)
         ORDER BY r.id ASC
         LIMIT ?2`
      )
      // Failures are retried on every cron run (there is no attempt cap, so fixing a bad key
      // recovers everything). Keep the batch small: each row is a fetch plus a D1 write, and a
      // Worker invocation has a subrequest limit.
      .bind(options.registrationId ?? null, options.limit ?? 20)
      .all<MailerLiteRegistrationRow>();

    for (const row of pending.results || []) {
      result.attempted += 1;
      const attemptedAt = (options.now ?? new Date()).toISOString();
      let error = '';
      try {
        const response = await fetcher(API_URL, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(buildMailerLiteSubscriber(row, groupId)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        // Always read the body so the connection is released before the next request.
        const body = await response.text();
        // MailerLite error bodies describe fields, not values; keep a short excerpt for admins.
        if (!response.ok) error = `HTTP ${response.status}: ${body.slice(0, 200)}`;
      } catch (fetchError) {
        error = fetchError instanceof Error ? fetchError.name : 'Request failed';
      }

      await database
        .prepare(
          `INSERT INTO volunteer_registration_mailerlite (registration_id, synced_at, attempts, last_error, last_attempt_at)
           VALUES (?1, ?2, 1, ?3, ?4)
           ON CONFLICT (registration_id) DO UPDATE SET
             -- An overlapping run that failed must not undo a success recorded by another run.
             synced_at = CASE WHEN volunteer_registration_mailerlite.synced_at <> '' THEN volunteer_registration_mailerlite.synced_at ELSE excluded.synced_at END,
             attempts = volunteer_registration_mailerlite.attempts + 1,
             last_error = CASE WHEN volunteer_registration_mailerlite.synced_at <> '' THEN '' ELSE excluded.last_error END,
             last_attempt_at = excluded.last_attempt_at`
        )
        .bind(row.id, error ? '' : attemptedAt, error, attemptedAt)
        .run();

      if (error) {
        result.failed += 1;
        console.error('MailerLite sync failed for registration', row.id, error);
      } else {
        result.synced += 1;
      }
    }
  } catch (error) {
    console.error('MailerLite sync could not run', error instanceof Error ? error.message : error);
  }
  return result;
}

export interface MailerLiteSyncStatus {
  lastSyncedAt: string;
  failed: number;
  pending: number;
}

/** Summary for the admin badge: last successful sync, plus anything still waiting or failing. */
export async function getMailerLiteSyncStatus(database: D1Database): Promise<MailerLiteSyncStatus> {
  await ensureVolunteerSchema(database);
  const row = await database
    .prepare(
      `SELECT
        (SELECT MAX(synced_at) FROM volunteer_registration_mailerlite WHERE synced_at <> '') AS last_synced_at,
        (SELECT COUNT(*) FROM volunteer_registration_mailerlite m JOIN volunteer_registrations r ON r.id = m.registration_id
          WHERE m.synced_at = '' AND m.last_error <> ''
            AND r.id = (SELECT MAX(r2.id) FROM volunteer_registrations r2 WHERE r2.email_normalized = r.email_normalized)) AS failed,
        (SELECT COUNT(*) FROM volunteer_registrations r
          WHERE r.email_normalized <> ''
            AND r.id = (SELECT MAX(r2.id) FROM volunteer_registrations r2 WHERE r2.email_normalized = r.email_normalized)
            AND NOT EXISTS (SELECT 1 FROM volunteer_registration_mailerlite m WHERE m.registration_id = r.id)) AS pending`
    )
    .first<{ last_synced_at: string | null; failed: number; pending: number }>();
  return {
    lastSyncedAt: row?.last_synced_at || '',
    failed: Number(row?.failed || 0),
    pending: Number(row?.pending || 0),
  };
}
