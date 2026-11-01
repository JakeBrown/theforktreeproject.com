import type { APIRoute } from 'astro';
import { addDays, getAdelaideDate } from '../../../lib/volunteerAttendance';
import { buildIcsCalendar, isCalendarStatus, statusInfo } from '../../../lib/volunteerCalendar';
import { loadCalendarEntries } from '../../../lib/volunteerCalendarData';
import {
  getCalendarToken,
  getVolunteerDatabase,
  refreshVolunteerRecords,
  tokensMatch,
} from '../../../lib/volunteerDb';

export const prerender = false;

const PAST_DAYS = 180;
const FUTURE_DAYS = 366;

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });

/**
 * Live volunteer calendar for Outlook, Google and Apple Calendar subscriptions. Calendar apps
 * cannot send a password, so the secret token in the URL is the protection. Admins can replace the
 * token from /admin/calendar, which stops every existing subscription.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const token = String(params.token || '');
  const feed = /^(all|signed-in|signed-out|scheduled)\.ics$/.exec(String(params.feed || ''))?.[1];
  const database = getVolunteerDatabase(locals);
  if (!feed || !database || token.length < 20) return notFound();

  try {
    if (!tokensMatch(await getCalendarToken(database), token)) return notFound();

    await refreshVolunteerRecords(database);
    const today = getAdelaideDate();
    const entries = await loadCalendarEntries(database, addDays(today, -PAST_DAYS), addDays(today, FUTURE_DAYS));
    const filtered = feed === 'all' ? entries : entries.filter((entry) => isCalendarStatus(feed) && entry.status === feed);
    const calendarName = feed === 'all'
      ? 'Forktree volunteers'
      : `Forktree volunteers – ${statusInfo(feed as Parameters<typeof statusInfo>[0]).label.toLowerCase()}`;

    return new Response(buildIcsCalendar(filtered, { calendarName }), {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `inline; filename="forktree-volunteers-${feed}.ics"`,
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex, nofollow',
        'referrer-policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('Volunteer calendar feed failed', error);
    return new Response('Calendar unavailable', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
};
