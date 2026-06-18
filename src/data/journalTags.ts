export const journalTags = [
  { slug: 'rewilding', label: 'Rewilding' },
  { slug: 'tree-planting', label: 'Tree Planting' },
  { slug: 'planting-season', label: 'Planting Season' },
  { slug: 'seed-nursery', label: 'Seed Nursery' },
  { slug: 'rare-seed-orchard', label: 'Rare Seed Orchard' },
  { slug: 'native-plants', label: 'Native Plants' },
  { slug: 'wildlife', label: 'Wildlife' },
  { slug: 'birds', label: 'Birds' },
  { slug: 'butterflies-moths', label: 'Butterflies & Moths' },
  { slug: 'weed-control', label: 'Weed Control' },
  { slug: 'water-management', label: 'Water Management' },
  { slug: 'recycling-reuse', label: 'Recycling & Reuse' },
  { slug: 'sustainable-infrastructure', label: 'Sustainable Infrastructure' },
  { slug: 'renewable-energy', label: 'Renewable Energy' },
  { slug: 'education-programs', label: 'Education Programs' },
  { slug: 'school-visits', label: 'School Visits' },
  { slug: 'volunteering', label: 'Volunteering' },
  { slug: 'team-days', label: 'Team Days' },
  { slug: 'community-events', label: 'Community Events' },
  { slug: 'partnerships', label: 'Partnerships' },
  { slug: 'climate-action', label: 'Climate Action' },
  { slug: 'national-tree-day', label: 'National Tree Day' },
  { slug: 'world-environment-day', label: 'World Environment Day' },
] as const;

export type JournalTag = (typeof journalTags)[number];
export type JournalTagSlug = JournalTag['slug'];

export const journalTagSlugs = journalTags.map((tag) => tag.slug) as [JournalTagSlug, ...JournalTagSlug[]];

const journalTagMap = Object.fromEntries(
  journalTags.map((tag) => [tag.slug, tag])
) as Record<JournalTagSlug, JournalTag>;

export function isJournalTagSlug(slug: string | null | undefined): slug is JournalTagSlug {
  return Boolean(slug && Object.prototype.hasOwnProperty.call(journalTagMap, slug));
}

export function getJournalTagLabel(slug: string): string {
  return isJournalTagSlug(slug) ? journalTagMap[slug].label : slug;
}

export function getJournalTagHref(slug: string, basePath = '/blog'): string {
  const params = new URLSearchParams({ tag: slug });
  return `${basePath}?${params.toString()}`;
}

export function getJournalPageHref(basePath: string, page: number, tag?: string | null): string {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return `${basePath}${query ? `?${query}` : ''}`;
}
