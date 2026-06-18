import type { APIRoute } from 'astro';
import { searchJournal } from '../../lib/journalSearch';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const env = import.meta.env.DEV ? {} : (locals as any).runtime?.env || {};

  const result = await searchJournal(env, query);

  return new Response(JSON.stringify(result), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
