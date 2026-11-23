import { defineMiddleware } from 'astro:middleware';
import { verifyAccessJwt, type AccessIdentity } from './lib/cloudflareAccess';

const ASSET_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|map|json|xml|txt)$/i;
const ADMIN_PATH = /^\/admin(?:\/|$)/i;
// The volunteer calendar feed URL contains its secret token, so never record it in analytics.
const PRIVATE_FEED_PATH = /^\/volunteer-calendar\//;

// Astro decodes the pathname before matching routes, so /%61dmin reaches the /admin pages. Match on
// the decoded path too, and treat undecodable paths as admin so they can never skip the check.
function isAdminPath(pathname: string): boolean {
  if (ADMIN_PATH.test(pathname)) return true;
  try {
    return ADMIN_PATH.test(decodeURI(pathname));
  } catch {
    return true;
  }
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
  return new Response('Sign in through Cloudflare Access to view this page.', {
    status: 403,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

// Cloudflare Access protects /admin. The Worker re-checks the signed Access token so that requests
// reaching it without Access (for example via a hostname Access does not cover) are refused.
async function adminIdentity(request: Request, env: Record<string, unknown> | undefined): Promise<AccessIdentity | null> {
  // `astro dev` has no Access in front of it; production builds never take this branch.
  if (import.meta.env.DEV) return { email: 'local-dev' };
  return verifyAccessJwt(request.headers.get('cf-access-jwt-assertion'), {
    teamDomain: String(env?.CF_ACCESS_TEAM_DOMAIN ?? ''),
    audience: String(env?.CF_ACCESS_AUD ?? ''),
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isAdminRequest = isAdminPath(url.pathname);

  const env = (context.locals as any).runtime?.env as Record<string, unknown> | undefined;
  const identity = isAdminRequest ? await adminIdentity(context.request, env) : null;

  if (isAdminRequest && !identity) {
    return unauthorizedResponse();
  }

  // Browsers send the Access cookie with some cross-site requests, so changes made by a signed-in
  // person must come from an admin page on this site. Service tokens are sent explicitly by scripts.
  if (
    isAdminRequest &&
    identity?.email &&
    !['GET', 'HEAD'].includes(context.request.method) &&
    !isSameOriginRequest(context.request)
  ) {
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
