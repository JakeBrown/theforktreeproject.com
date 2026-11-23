/**
 * Verifies the Cloudflare Access JWT that Access adds to every request it lets through.
 *
 * Access sits in front of /admin, but the Worker still checks the token itself so a request that
 * reaches the Worker some other way (a route Access does not cover, a misconfigured policy) is
 * refused rather than trusted. See https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

export interface AccessConfig {
  /** Team domain, e.g. "forktree.cloudflareaccess.com" (with or without https://). */
  teamDomain: string;
  /** Application audience (AUD) tag from the Access application. */
  audience: string;
}

export interface AccessIdentity {
  /** Email of a person who signed in with a one-time PIN. */
  email?: string;
  /** Client ID of a service token, for programmatic access. */
  serviceTokenId?: string;
}

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
}

type FetchLike = (input: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const CERTS_TTL_MS = 60 * 60 * 1000;
// Unknown key IDs come from unauthenticated tokens, so limit how often they can force a refetch.
const FORCED_REFRESH_INTERVAL_MS = 60 * 1000;
const CLOCK_SKEW_SECONDS = 60;
const keyCache = new Map<string, { keys: Map<string, CryptoKey>; fetchedAt: number }>();

export function normalizeTeamDomain(teamDomain: string): string {
  return teamDomain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('Invalid base64url');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonSegment(value: string): Record<string, unknown> {
  const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JWT segment');
  return parsed as Record<string, unknown>;
}

async function loadSigningKeys(teamDomain: string, fetcher: FetchLike, now: number, forceRefresh: boolean) {
  const cached = keyCache.get(teamDomain);
  if (cached) {
    const age = now - cached.fetchedAt;
    if (forceRefresh ? age < FORCED_REFRESH_INTERVAL_MS : age < CERTS_TTL_MS) return cached.keys;
  }

  try {
    const response = await fetcher(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error('Could not load Access signing keys');
    const body = (await response.json()) as { keys?: Jwk[] };

    const keys = new Map<string, CryptoKey>();
    for (const jwk of body.keys ?? []) {
      if (jwk.kty !== 'RSA' || !jwk.kid) continue;
      const key = await crypto.subtle.importKey(
        'jwk',
        { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      keys.set(jwk.kid, key);
    }
    if (keys.size === 0) throw new Error('Access returned no signing keys');
    keyCache.set(teamDomain, { keys, fetchedAt: now });
    return keys;
  } catch (error) {
    // Keep accepting tokens signed by keys we already trust if Access is briefly unreachable.
    if (cached) {
      keyCache.set(teamDomain, { keys: cached.keys, fetchedAt: now - CERTS_TTL_MS + FORCED_REFRESH_INTERVAL_MS });
      return cached.keys;
    }
    throw error;
  }
}

/**
 * Returns the signed-in identity, or null when the token is missing, malformed, expired, signed by
 * an unknown key, or issued for a different team or application. Never throws.
 */
export async function verifyAccessJwt(
  token: string | null | undefined,
  config: AccessConfig,
  options: { fetcher?: FetchLike; now?: number } = {},
): Promise<AccessIdentity | null> {
  const teamDomain = normalizeTeamDomain(config.teamDomain || '');
  const audience = (config.audience || '').trim();
  if (!token || !teamDomain || !audience) return null;

  const fetcher = options.fetcher ?? ((input: string) => fetch(input));
  const now = options.now ?? Date.now();

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJsonSegment(encodedHeader);
    const payload = decodeJsonSegment(encodedPayload);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;

    let keys = await loadSigningKeys(teamDomain, fetcher, now, false);
    // Access rotates keys; refetch once if this token uses a key we have not seen.
    if (!keys.has(header.kid)) keys = await loadSigningKeys(teamDomain, fetcher, now, true);
    const key = keys.get(header.kid);
    if (!key) return null;

    const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlDecode(encodedSignature), signedData);
    if (!valid) return null;

    const nowSeconds = Math.floor(now / 1000);
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS < nowSeconds) return null;
    if (typeof payload.nbf === 'number' && payload.nbf - CLOCK_SKEW_SECONDS > nowSeconds) return null;
    if (payload.iss !== `https://${teamDomain}`) return null;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(audience)) return null;

    if (typeof payload.email === 'string' && payload.email) return { email: payload.email.toLowerCase() };
    if (typeof payload.common_name === 'string' && payload.common_name) return { serviceTokenId: payload.common_name };
    return null;
  } catch {
    return null;
  }
}

/** Test hook: forget cached signing keys. */
export function clearAccessKeyCache(): void {
  keyCache.clear();
}
