// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';

const { SENTRY_AUTH_TOKEN } = loadEnv(process.env.NODE_ENV ?? '', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: 'https://www.theforktreeproject.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/volunteer-sign-in'),
    }),
    sentry({
      project: 'theforktreeprojectcom',
      org: 'jakebrown',
      authToken: SENTRY_AUTH_TOKEN,
    }),
  ],
  adapter: cloudflare({
    imageService: 'compile',
    workerEntryPoint: {
      path: './src/worker.ts',
    },
  }),
  output: 'server',
  trailingSlash: 'never',
});
