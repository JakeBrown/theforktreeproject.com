import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { clearAccessKeyCache, normalizeTeamDomain, verifyAccessJwt } from '../src/lib/cloudflareAccess.ts';

const TEAM = 'example.cloudflareaccess.com';
const AUD = 'aud-tag-123';
const NOW = Date.UTC(2026, 10, 23, 0, 0, 0);
const config = { teamDomain: `https://${TEAM}/`, audience: AUD };

const keyPair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)) as CryptoKeyPair;
const otherKeyPair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)) as CryptoKeyPair;
const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const encode = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

async function sign(payload: Record<string, unknown>, options: { kid?: string; alg?: string; key?: CryptoKey } = {}) {
  const head = encode({ alg: options.alg ?? 'RS256', kid: options.kid ?? 'kid-1', typ: 'JWT' });
  const body = encode(payload);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    options.key ?? keyPair.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

const basePayload = () => ({
  aud: [AUD],
  iss: `https://${TEAM}`,
  exp: Math.floor(NOW / 1000) + 3600,
  iat: Math.floor(NOW / 1000),
  email: 'Liz@TheForktreeProject.com',
});

let fetchedUrls: string[] = [];
const fetcher = async (url: string) => {
  fetchedUrls.push(url);
  return { ok: true, json: async () => ({ keys: [{ ...publicJwk, kid: 'kid-1', alg: 'RS256' }] }) };
};
const verify = (token: string | null, overrides = {}) => verifyAccessJwt(token, { ...config, ...overrides }, { fetcher, now: NOW });

beforeEach(() => {
  clearAccessKeyCache();
  fetchedUrls = [];
});

test('accepts a valid email token and lowercases the email', async () => {
  assert.deepEqual(await verify(await sign(basePayload())), { email: 'liz@theforktreeproject.com' });
  assert.deepEqual(fetchedUrls, [`https://${TEAM}/cdn-cgi/access/certs`]);
});

test('accepts a service token identity', async () => {
  const { email, ...rest } = basePayload();
  assert.deepEqual(await verify(await sign({ ...rest, common_name: 'abc.access', aud: AUD })), {
    serviceTokenId: 'abc.access',
  });
});

test('rejects missing, malformed and unconfigured tokens', async () => {
  assert.equal(await verify(null), null);
  assert.equal(await verify('not-a-jwt'), null);
  assert.equal(await verify('a.b.c'), null);
  assert.equal(await verify(await sign(basePayload()), { audience: '' }), null);
  assert.equal(await verify(await sign(basePayload()), { teamDomain: '' }), null);
});

test('rejects wrong audience, issuer, expiry and not-before', async () => {
  assert.equal(await verify(await sign({ ...basePayload(), aud: ['other-app'] })), null);
  assert.equal(await verify(await sign({ ...basePayload(), iss: 'https://evil.cloudflareaccess.com' })), null);
  assert.equal(await verify(await sign({ ...basePayload(), exp: Math.floor(NOW / 1000) - 120 })), null);
  assert.equal(await verify(await sign({ ...basePayload(), nbf: Math.floor(NOW / 1000) + 600 })), null);
  const { exp, ...noExp } = basePayload();
  assert.equal(await verify(await sign(noExp)), null);
});

test('rejects bad signatures, unknown keys and other algorithms', async () => {
  assert.equal(await verify(await sign(basePayload(), { key: otherKeyPair.privateKey })), null);
  assert.equal(await verify(await sign(basePayload(), { kid: 'unknown' })), null);
  assert.equal(await verify(await sign(basePayload(), { alg: 'HS256' })), null);
  const token = await sign(basePayload());
  const [h, , s] = token.split('.');
  assert.equal(await verify(`${h}.${encode({ ...basePayload(), email: 'attacker@example.com' })}.${s}`), null);
});

test('rejects tokens with neither email nor service token', async () => {
  const { email, ...rest } = basePayload();
  assert.equal(await verify(await sign(rest)), null);
});

test('refetches for an unseen key id at most once a minute', async () => {
  await verify(await sign(basePayload()));
  await verify(await sign(basePayload(), { kid: 'rotated' }));
  assert.equal(fetchedUrls.length, 1);
  const later = NOW + 61_000;
  await verifyAccessJwt(await sign({ ...basePayload(), iat: later / 1000 }, { kid: 'rotated' }), config, { fetcher, now: later });
  assert.equal(fetchedUrls.length, 2);
});

test('keeps using cached keys when a refresh fails', async () => {
  const token = await sign(basePayload());
  assert.ok(await verify(token));
  const failing = async () => ({ ok: false, json: async () => ({}) });
  const later = NOW + 2 * 60 * 60 * 1000;
  const fresh = await sign({ ...basePayload(), exp: Math.floor(later / 1000) + 600 });
  assert.deepEqual(await verifyAccessJwt(fresh, config, { fetcher: failing, now: later }), { email: 'liz@theforktreeproject.com' });
});

test('fails closed when the certs endpoint is unavailable', async () => {
  const token = await sign(basePayload());
  const result = await verifyAccessJwt(token, config, { fetcher: async () => ({ ok: false, json: async () => ({}) }), now: NOW });
  assert.equal(result, null);
});

test('normalizes team domains', () => {
  assert.equal(normalizeTeamDomain(' https://team.cloudflareaccess.com/ '), 'team.cloudflareaccess.com');
});
