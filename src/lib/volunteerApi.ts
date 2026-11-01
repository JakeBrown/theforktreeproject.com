import type { D1Database } from './volunteerDb.ts';

const MAX_BODY_BYTES = 10_000;
// Allow busy group arrivals and departures on a shared device while still bounding automated abuse.
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export async function readLimitedBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string | null> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      // Do not let a failed stream cancellation turn the intended 413 into a 400.
      void reader.cancel().catch(() => undefined);
      return null;
    }

    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

/** Reject anything that is not a same-origin JSON POST. Returns an error response, or null to continue. */
export function rejectInvalidJsonRequest(request: Request): Response | null {
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
  return null;
}

/** Parse a JSON object body. Returns the object, or an error response. */
export async function readJsonObject<T>(request: Request): Promise<{ input: Partial<T> } | { response: Response }> {
  try {
    const body = await readLimitedBody(request);
    if (body === null) return { response: jsonResponse({ ok: false, message: 'Invalid submission.' }, 413) };
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { response: jsonResponse({ ok: false, message: 'Invalid submission.' }, 400) };
    }
    return { input: parsed as Partial<T> };
  } catch {
    return { response: jsonResponse({ ok: false, message: 'Invalid submission.' }, 400) };
  }
}

async function getClientKey(request: Request): Promise<string> {
  const clientAddress = request.headers.get('cf-connecting-ip') || 'unknown-client';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientAddress));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Shared by sign-in and sign-out so a single device's attempts are counted together. */
export async function isRateLimited(database: D1Database, request: Request): Promise<boolean> {
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
