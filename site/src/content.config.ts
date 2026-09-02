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
  // Required, not optional, and that is the decision rather than an oversight. The
  // published order is not derivable from anything else the frontmatter carries —
  // two entries share a period — so an entry without this has no defined position.
  // Falling back to some default would place it plausibly and wrongly, which is how
  // the previous alphabetical ordering survived unnoticed. Failing the build names
  // the file instead.
  order: z.number().int().positive(),
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

// deploy