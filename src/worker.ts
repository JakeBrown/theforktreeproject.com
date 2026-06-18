import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import {
  JOURNAL_SEARCH_CRON,
  runJournalSearchReindex,
  type JournalSearchEnv,
} from './lib/journalSearch';

export function createExports(manifest: any) {
  const app = new App(manifest);

  return {
    default: {
      fetch(request: Request, env: JournalSearchEnv, ctx: any) {
        return handle(manifest, app, request, env, ctx);
      },

      scheduled(controller: { cron: string }, env: JournalSearchEnv, ctx: any) {
        switch (controller.cron) {
          case JOURNAL_SEARCH_CRON:
            ctx.waitUntil(
              runJournalSearchReindex(env, { reason: 'cron' })
                .then((result) => {
                  console.log('journal search reindex complete', result);
                })
                .catch((error) => {
                  console.error('journal search reindex failed', error);
                })
            );
            break;

          default:
            console.warn('Unhandled cron trigger', controller.cron);
        }
      },
    },
  };
}
