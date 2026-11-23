import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import {
  JOURNAL_SEARCH_CRON,
  runJournalSearchReindex,
  type JournalSearchEnv,
} from './lib/journalSearch';
import { syncRegistrationsToMailerLite, type MailerLiteEnv } from './lib/mailerliteSync';
import { refreshVolunteerRecords, type D1Database } from './lib/volunteerDb';

// 5pm in Adelaide is 06:30 UTC during daylight saving (ACDT) and 07:30 UTC otherwise (ACST).
// The job runs at both times; it only signs out records whose 5pm Adelaide time has passed.
const VOLUNTEER_AUTO_SIGN_OUT_CRON = '30 6,7 * * *';
// Hourly: send volunteer registrations that have not reached MailerLite yet, retrying failures.
const MAILERLITE_SYNC_CRON = '5 * * * *';

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

          case MAILERLITE_SYNC_CRON: {
            const database = (env as JournalSearchEnv & { VOLUNTEER_SIGN_INS?: D1Database }).VOLUNTEER_SIGN_INS;
            if (!database) {
              console.error('MailerLite sync skipped: D1 binding unavailable');
              break;
            }
            ctx.waitUntil(
              syncRegistrationsToMailerLite(database, env as MailerLiteEnv, { limit: 20 }).then((result) => {
                if (result.attempted || result.skipped) console.log('MailerLite sync', result);
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
