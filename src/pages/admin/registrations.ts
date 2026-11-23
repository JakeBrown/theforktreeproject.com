import type { APIRoute } from 'astro';

export const prerender = false;

/** Registration forms now live on each volunteer's profile. Keep old bookmarks working. */
export const GET: APIRoute = ({ url, redirect }) => {
  const name = (url.searchParams.get('name') || '').trim().slice(0, 100);
  return redirect(name ? `/admin/volunteers?name=${encodeURIComponent(name)}` : '/admin/volunteers', 301);
};
