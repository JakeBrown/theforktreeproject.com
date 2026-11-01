import { defineMiddleware } from 'astro:middleware';

const ASSET_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|map|json|xml|txt)$/i;
const ADMIN_PATH = /^\/admin(?:\/|$)/;
// The volunteer calendar feed URL contains its secret token, so never record it in analytics.
const PRIVATE_FEED_PATH = /^\/volunteer-calendar\//;
// Username: forktree-admin-4e7ac0. Store only the combined credential digest, not the plaintext password.
const ADMIN_CREDENTIALS_SHA256 = 'ce198f7695cfd32644f28e4f4f9a7aeb30b4e8182a2c623e812afc709aa9d722';

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hasValidAdminCredentials(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return false;

  const [scheme, encodedCredentials, extra] = authorization.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'basic' || !encodedCredentials || extra) return false;

  let credentials: string;
  try {
    credentials = atob(encodedCredentials);
  } catch {
    return false;
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credentials));
  const digestHex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(digestHex, ADMIN_CREDENTIALS_SHA256);
}

function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const source = request.headers.get('origin') || request.headers.get('referer');
  if (!source) return false;
  try {
    return new URL(source).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function unauthorizedResponse(): Response {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': 'Basic realm="Forktree admin", charset="UTF-8"',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isAdminRequest = ADMIN_PATH.test(url.pathname);

  if (isAdminRequest && !(await hasValidAdminCredentials(context.request))) {
    return unauthorizedResponse();
  }

  // Browsers resend Basic auth credentials on cross-site form posts, so admin changes must come
  // from an admin page on this site.
  if (isAdminRequest && !['GET', 'HEAD'].includes(context.request.method) && !isSameOriginRequest(context.request)) {
    return new Response('Cross-site admin requests are not allowed.', {
      status: 403,
      headers: { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const response = await next();

  if (isAdminRequest) {
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    // Admin URLs can contain volunteer names in filter parameters. Never send them to analytics.
    return response;
  }

  // Only log actual page views, not assets, prerendered builds or private feeds
  if (ASSET_EXTENSIONS.test(url.pathname) || url.pathname.startsWith('/_') || PRIVATE_FEED_PATH.test(url.pathname)) {
    return response;
  }

  const runtime = (context.locals as any).runtime;
  const analytics = runtime?.env?.ANALYTICS;

  if (analytics) {
    const request = context.request;
    const cf = (request as any).cf;

    analytics.writeDataPoint({
      blobs: [
        url.pathname,
        request.headers.get('referer') || '',
        cf?.country || '',
        request.headers.get('user-agent') || '',
        request.method,
      ],
      doubles: [1],
      indexes: [cf?.country || 'unknown'],
    });
  }

  return response;
});
