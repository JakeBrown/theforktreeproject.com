import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import {
  JOURNAL_SEARCH_CRON,
  runJournalSearchReindex,
  type JournalSearchEnv,
} from './lib/journalSearch';
import { refreshVolunteerRecords, type D1Database } from './lib/volunteerDb';

// 5pm in Adelaide is 06:30 UTC during daylight saving (ACDT) and 07:30 UTC otherwise (ACST).
// The job runs at both times; it only signs out records whose 5pm Adelaide time has passed.
const VOLUNTEER_AUTO_SIGN_OUT_CRON = '30 6,7 * * *';

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

          case VOLUNTEER_AUTO_SIGN_OUT_CRON: {
            const database = (env as JournalSearchEnv & { VOLUNTEER_SIGN_INS?: D1Database }).VOLUNTEER_SIGN_INS;
            if (!database) {
              console.error('volunteer auto sign-out skipped: D1 binding unavailable');
              break;
            }
            ctx.waitUntil(
              refreshVolunteerRecords(database).catch((error) => {
                console.error('volunteer auto sign-out failed', error);
              })
            );
            break;
          }

          default:
            console.warn('Unhandled cron trigger', controller.cron);
        }
      },
    },
  };
}
