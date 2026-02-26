import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('journal')).sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title: 'The Forktree Project — Journal',
    description: 'Follow the rewilding journey of The Forktree Project, a habitat restoration charity on South Australia\'s Fleurieu Peninsula.',
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.excerpt || '',
      link: `/journal/${post.id}`,
    })),
  });
}
