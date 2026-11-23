import type { APIRoute } from 'astro';

export const prerender = false;

/** The Sign-ins page was folded into the Calendar. Keep old bookmarks working. */
export const GET: APIRoute = ({ url, redirect }) => {
  const month = url.searchParams.get('month');
  return redirect(month && /^\d{4}-\d{2}$/.test(month) ? `/admin/calendar?month=${month}` : '/admin/calendar', 301);
};
