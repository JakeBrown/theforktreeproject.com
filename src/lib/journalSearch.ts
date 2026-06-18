import {
  JOURNAL_SEARCH_POSTS,
  JOURNAL_SEARCH_VERSION,
  type JournalSearchPost,
} from './journalSearchData';

export const JOURNAL_SEARCH_CRON = '17 3 * * *';

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const CHUNK_WORDS = 220;
const CHUNK_OVERLAP_WORDS = 40;
const EMBEDDING_BATCH_SIZE = 16;
const SEARCH_TOP_K = 24;
const RESULT_LIMIT = 12;
const INDEXED_VERSION_KEY = 'journal-search:indexed-version';
const LAST_RESULT_KEY = 'journal-search:last-result';

type WorkersAiBinding = {
  run: (model: string, input: unknown) => Promise<{ data?: number[][] }>;
};

type VectorizeBinding = {
  upsert: (vectors: Array<{ id: string; values: number[]; namespace?: string; metadata?: Record<string, unknown> }>) => Promise<unknown>;
  query: (
    vector: number[],
    options: {
      topK?: number;
      namespace?: string;
      returnValues?: boolean;
      returnMetadata?: 'none' | 'indexed' | 'all';
    }
  ) => Promise<{ matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>;
};

type KvBinding = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
};

export type JournalSearchEnv = {
  AI?: WorkersAiBinding;
  JOURNAL_VECTORIZE?: VectorizeBinding;
  JOURNAL_SEARCH_KV?: KvBinding;
};

export type JournalSearchResult = {
  slug: string;
  href: string;
  title: string;
  date: string;
  tags: string[];
  excerpt?: string;
  image?: string;
  snippet: string;
  score: number;
  matchType: 'keyword' | 'semantic';
};

export type JournalSearchResponse = {
  query: string;
  mode: 'semantic' | 'keyword';
  version: string;
  indexedVersion: string | null;
  results: JournalSearchResult[];
  message?: string;
};

type JournalChunk = {
  id: string;
  post: JournalSearchPost;
  index: number;
  text: string;
};

function hasSearchBindings(env: JournalSearchEnv): env is Required<Pick<JournalSearchEnv, 'AI' | 'JOURNAL_VECTORIZE'>> & JournalSearchEnv {
  return Boolean(env.AI && env.JOURNAL_VECTORIZE);
}

function normaliseQuery(query: string): string {
  return query.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function createSnippet(text: string, maxLength = 260): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLength) return trimmed;

  const clipped = trimmed.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 120 ? lastSpace : maxLength).trim()}…`;
}

function postFallbackSnippet(post: JournalSearchPost): string {
  return createSnippet(post.excerpt || post.text);
}

function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [])
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function createKeywordSnippet(post: JournalSearchPost, query: string, terms: string[]): string {
  const phrase = query.toLowerCase();
  const sentences = splitSentences(post.text);
  const scoredSentences = sentences
    .map((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();
      const termHits = terms.filter((term) => lowerSentence.includes(term)).length;
      const phraseHit = phrase.length > 1 && lowerSentence.includes(phrase) ? 1 : 0;
      return {
        sentence,
        index,
        score: phraseHit * 10 + termHits,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scoredSentences[0] ? createSnippet(scoredSentences[0].sentence) : postFallbackSnippet(post);
}

function chunkPost(post: JournalSearchPost): JournalChunk[] {
  const words = post.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: JournalChunk[] = [];
  const step = CHUNK_WORDS - CHUNK_OVERLAP_WORDS;

  for (let start = 0, index = 0; start < words.length; start += step, index++) {
    const chunkWords = words.slice(start, start + CHUNK_WORDS);
    const text = chunkWords.join(' ');
    if (!text.trim()) continue;

    chunks.push({
      id: `${post.slug}:${index}`,
      post,
      index,
      text,
    });

    if (start + CHUNK_WORDS >= words.length) break;
  }

  return chunks;
}

export function getJournalSearchChunks(): JournalChunk[] {
  return JOURNAL_SEARCH_POSTS.flatMap(chunkPost);
}

async function getIndexedVersion(env: JournalSearchEnv): Promise<string | null> {
  if (!env.JOURNAL_SEARCH_KV) return null;
  return env.JOURNAL_SEARCH_KV.get(INDEXED_VERSION_KEY);
}

async function setIndexedVersion(env: JournalSearchEnv, result: JournalReindexResult): Promise<void> {
  if (!env.JOURNAL_SEARCH_KV) return;
  await env.JOURNAL_SEARCH_KV.put(INDEXED_VERSION_KEY, result.version);
  await env.JOURNAL_SEARCH_KV.put(LAST_RESULT_KEY, JSON.stringify(result));
}

async function embedTexts(env: JournalSearchEnv, texts: string[]): Promise<number[][]> {
  if (!env.AI) throw new Error('Workers AI binding is not configured');
  const response = await env.AI.run(EMBEDDING_MODEL, { text: texts });
  const embeddings = response.data;

  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error('Workers AI returned an unexpected embedding response');
  }

  return embeddings;
}

function keywordSearch(query: string, limit = RESULT_LIMIT): JournalSearchResult[] {
  const terms = normaliseQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 1);

  if (terms.length === 0) return [];

  return JOURNAL_SEARCH_POSTS.map((post) => {
    const title = post.title.toLowerCase();
    const excerpt = (post.excerpt || '').toLowerCase();
    const text = post.text.toLowerCase();
    const score = terms.reduce((total, term) => {
      let next = total;
      if (title.includes(term)) next += 6;
      if (excerpt.includes(term)) next += 3;
      if (text.includes(term)) next += 1;
      return next;
    }, 0);

    return { post, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => new Date(b.post.date).getTime() - new Date(a.post.date).getTime() || b.score - a.score)
    .slice(0, limit)
    .map(({ post, score }) => ({
      slug: post.slug,
      href: post.href,
      title: post.title,
      date: post.date,
      tags: post.tags,
      excerpt: post.excerpt,
      image: post.image,
      snippet: createKeywordSnippet(post, normaliseQuery(query), terms),
      score,
      matchType: 'keyword' as const,
    }));
}

export type JournalReindexResult = {
  ok: boolean;
  skipped: boolean;
  reason: 'unchanged' | 'indexed' | 'missing-bindings';
  version: string;
  chunks: number;
  posts: number;
  startedAt: string;
  completedAt: string;
  error?: string;
};

export async function runJournalSearchReindex(
  env: JournalSearchEnv,
  options: { force?: boolean; reason?: string } = {}
): Promise<JournalReindexResult> {
  const startedAt = new Date().toISOString();
  const chunks = getJournalSearchChunks();

  if (!hasSearchBindings(env)) {
    const result: JournalReindexResult = {
      ok: false,
      skipped: true,
      reason: 'missing-bindings',
      version: JOURNAL_SEARCH_VERSION,
      chunks: chunks.length,
      posts: JOURNAL_SEARCH_POSTS.length,
      startedAt,
      completedAt: new Date().toISOString(),
      error: 'AI and JOURNAL_VECTORIZE bindings are required for semantic indexing.',
    };
    await env.JOURNAL_SEARCH_KV?.put(LAST_RESULT_KEY, JSON.stringify(result));
    return result;
  }

  const indexedVersion = await getIndexedVersion(env);
  if (!options.force && indexedVersion === JOURNAL_SEARCH_VERSION) {
    const result: JournalReindexResult = {
      ok: true,
      skipped: true,
      reason: 'unchanged',
      version: JOURNAL_SEARCH_VERSION,
      chunks: chunks.length,
      posts: JOURNAL_SEARCH_POSTS.length,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await env.JOURNAL_SEARCH_KV?.put(LAST_RESULT_KEY, JSON.stringify(result));
    return result;
  }

  try {
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const embeddings = await embedTexts(env, batch.map((chunk) => chunk.text));

      await env.JOURNAL_VECTORIZE.upsert(
        batch.map((chunk, batchIndex) => ({
          id: chunk.id,
          namespace: JOURNAL_SEARCH_VERSION,
          values: embeddings[batchIndex],
          metadata: {
            slug: chunk.post.slug,
            href: chunk.post.href,
            title: chunk.post.title,
            date: chunk.post.date,
            tags: chunk.post.tags.join(','),
            excerpt: chunk.post.excerpt || '',
            image: chunk.post.image || '',
            chunkIndex: chunk.index,
            text: createSnippet(chunk.text, 1200),
          },
        }))
      );
    }

    const result: JournalReindexResult = {
      ok: true,
      skipped: false,
      reason: 'indexed',
      version: JOURNAL_SEARCH_VERSION,
      chunks: chunks.length,
      posts: JOURNAL_SEARCH_POSTS.length,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    await setIndexedVersion(env, result);
    return result;
  } catch (error) {
    const result: JournalReindexResult = {
      ok: false,
      skipped: false,
      reason: 'indexed',
      version: JOURNAL_SEARCH_VERSION,
      chunks: chunks.length,
      posts: JOURNAL_SEARCH_POSTS.length,
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
    await env.JOURNAL_SEARCH_KV?.put(LAST_RESULT_KEY, JSON.stringify(result));
    throw error;
  }
}

export async function searchJournal(env: JournalSearchEnv, query: string): Promise<JournalSearchResponse> {
  const normalisedQuery = normaliseQuery(query);
  const indexedVersion = await getIndexedVersion(env);
  const activeVersion = indexedVersion || JOURNAL_SEARCH_VERSION;

  if (!normalisedQuery) {
    return {
      query: normalisedQuery,
      mode: 'keyword',
      version: JOURNAL_SEARCH_VERSION,
      indexedVersion,
      results: [],
    };
  }

  if (!hasSearchBindings(env)) {
    return {
      query: normalisedQuery,
      mode: 'keyword',
      version: JOURNAL_SEARCH_VERSION,
      indexedVersion,
      results: keywordSearch(normalisedQuery),
      message: 'Semantic search is not configured yet, so keyword results are shown.',
    };
  }

  try {
    const [queryEmbedding] = await embedTexts(env, [normalisedQuery]);
    const matches = await env.JOURNAL_VECTORIZE.query(queryEmbedding, {
      topK: SEARCH_TOP_K,
      namespace: activeVersion,
      returnValues: false,
      returnMetadata: 'all',
    });

    const postMap = new Map(JOURNAL_SEARCH_POSTS.map((post) => [post.slug, post]));
    const grouped = new Map<string, JournalSearchResult>();

    for (const match of matches.matches || []) {
      const metadata = match.metadata || {};
      const slug = typeof metadata.slug === 'string' ? metadata.slug : match.id.split(':')[0];
      const existing = grouped.get(slug);
      if (existing && existing.score >= match.score) continue;

      const post = postMap.get(slug);
      const tags = post?.tags || (typeof metadata.tags === 'string' ? metadata.tags.split(',').filter(Boolean) : []);

      grouped.set(slug, {
        slug,
        href: post?.href || (typeof metadata.href === 'string' ? metadata.href : `/blog/${slug}`),
        title: post?.title || (typeof metadata.title === 'string' ? metadata.title : slug),
        date: post?.date || (typeof metadata.date === 'string' ? metadata.date : ''),
        tags,
        excerpt: post?.excerpt || (typeof metadata.excerpt === 'string' ? metadata.excerpt : undefined),
        image: post?.image || (typeof metadata.image === 'string' ? metadata.image : undefined),
        snippet: typeof metadata.text === 'string' ? createSnippet(metadata.text) : post ? postFallbackSnippet(post) : '',
        score: match.score,
        matchType: 'semantic',
      });
    }

    const results = Array.from(grouped.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.score - a.score)
      .slice(0, RESULT_LIMIT);

    if (results.length === 0) {
      return {
        query: normalisedQuery,
        mode: 'keyword',
        version: JOURNAL_SEARCH_VERSION,
        indexedVersion,
        results: keywordSearch(normalisedQuery),
        message: 'The semantic index has no matches yet, so keyword results are shown.',
      };
    }

    return {
      query: normalisedQuery,
      mode: 'semantic',
      version: JOURNAL_SEARCH_VERSION,
      indexedVersion,
      results,
    };
  } catch (error) {
    return {
      query: normalisedQuery,
      mode: 'keyword',
      version: JOURNAL_SEARCH_VERSION,
      indexedVersion,
      results: keywordSearch(normalisedQuery),
      message: error instanceof Error ? `Semantic search failed: ${error.message}` : 'Semantic search failed.',
    };
  }
}
