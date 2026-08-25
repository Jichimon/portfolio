import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const localeSchema = z.enum(['en', 'es']);

const pageFrontmatterSchema = z.looseObject({
  slug: z.string(),
  lang: localeSchema,
  type: z.literal('page'),
  title: z.string(),
  confidentiality: z.string(),
});

const caseStudyFrontmatterSchema = z.looseObject({
  slug: z.string(),
  lang: localeSchema,
  type: z.union([z.literal('case-study'), z.literal('platform')]),
  title: z.string(),
  confidentiality: z.string(),
});

const uiFrontmatterSchema = z.looseObject({
  slug: z.string(),
  lang: localeSchema,
  type: z.literal('ui'),
  title: z.string(),
  confidentiality: z.string(),
});

// The loader's default id prefers frontmatter's own `slug` when present, and every
// entry here carries one — so the English and Spanish half of a pair would collide
// on the same id and one would silently overwrite the other in the store. The id is
// generated from the file path instead, which is unique per locale by construction;
// pairing across locales is the join this collection's consumers do on `slug`, never on this id.
const generateIdFromEntryPath = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

const pages = defineCollection({
  loader: glob({ pattern: '!(ui).{en,es}.md', base: '../resources/site', generateId: generateIdFromEntryPath }),
  schema: pageFrontmatterSchema,
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: '*.{en,es}.md',
    base: '../resources/case-studies',
    generateId: generateIdFromEntryPath,
  }),
  schema: caseStudyFrontmatterSchema,
});

const ui = defineCollection({
  loader: glob({ pattern: 'ui.{en,es}.md', base: '../resources/site', generateId: generateIdFromEntryPath }),
  schema: uiFrontmatterSchema,
});

export const collections = { pages, caseStudies, ui };
