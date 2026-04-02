import { defineMiddleware } from 'astro:middleware';

const ASSET_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|map|json|xml|txt)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  const url = new URL(context.request.url);

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
