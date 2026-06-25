import { getJournalThumbnailSrc } from '../data/journalThumbnails';

const rawJournalPosts = import.meta.glob('../content/journal/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

export type JournalSearchPost = {
  slug: string;
  href: string;
  title: string;
  date: string;
  tags: string[];
  image?: string;
  excerpt?: string;
  text: string;
};

function parseYamlString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1).replace(/\\"/g, '"');
    }
  }
  return trimmed;
}

function parseYamlStringArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => parseYamlString(item.trim()))
      .filter(Boolean);
  }
}

function parseFrontmatter(frontmatter: string): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};

  for (const line of frontmatter.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!key) continue;

    data[key] = key === 'tags' ? parseYamlStringArray(value) : parseYamlString(value);
  }

  return data;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~#]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stableHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function parsePost(path: string, raw: string): JournalSearchPost | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const [, frontmatter, body] = match;
  const data = parseFrontmatter(frontmatter);
  const filename = path.split('/').pop() || '';
  const slug = filename.replace(/\.md$/, '');
  const title = typeof data.title === 'string' ? data.title : slug;
  const date = typeof data.date === 'string' ? data.date : '';
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const image = typeof data.image === 'string' ? getJournalThumbnailSrc(data.image) : undefined;
  const excerpt = typeof data.excerpt === 'string' ? data.excerpt : undefined;
  const bodyText = markdownToPlainText(body);
  const text = [title, excerpt, bodyText].filter(Boolean).join('\n\n');

  return {
    slug,
    href: `/blog/${slug}`,
    title,
    date,
    tags,
    image,
    excerpt,
    text,
  };
}

export const JOURNAL_SEARCH_POSTS = Object.entries(rawJournalPosts)
  .map(([path, raw]) => parsePost(path, raw))
  .filter((post): post is JournalSearchPost => Boolean(post))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const JOURNAL_SEARCH_VERSION = `jv1-${stableHash(
  Object.entries(rawJournalPosts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, raw]) => `${path}\n${raw}`)
    .join('\n---\n')
)}`;
