import { defineMiddleware } from 'astro:middleware';

const ASSET_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|map|json|xml|txt)$/i;
const ADMIN_PATH = /^\/admin(?:\/|$)/;
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

  const response = await next();

  if (isAdminRequest) {
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-robots-tag', 'noindex, nofollow');
    // Admin URLs can contain volunteer names in filter parameters. Never send them to analytics.
    return response;
  }

  // Only log actual page views, not assets or prerendered builds
  if (ASSET_EXTENSIONS.test(url.pathname) || url.pathname.startsWith('/_')) {
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
