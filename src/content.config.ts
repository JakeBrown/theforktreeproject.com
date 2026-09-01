import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { journalTagSlugs } from './data/journalTags';

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().optional().default('Elizabeth Jarvis'),
    tags: z.array(z.enum(journalTagSlugs)).optional().default([]),
    image: z.string().optional(),
    excerpt: z.string().optional(),
  }),
});

const plants = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/plants' }),
  schema: z.object({
    title: z.string(),
    scientificName: z.string(),
    tagline: z.string(),
    month: z.string(),
    image: z.string(),
    imageAlt: z.string().optional(),
    imageCredit: z.string().optional(),
    imagePosition: z.string().optional(),
  }),
});

export const collections = { journal, plants };
