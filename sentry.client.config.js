import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://bb854e0f9ace54774a6080ed21a96509@o447635.ingest.us.sentry.io/4511261829758976',
  sendDefaultPii: true,
});
