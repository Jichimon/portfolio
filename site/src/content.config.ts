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

// One recommendation as the author transcribed it. `original_quote` is optional HERE and
// conditionally required a layer down: it is required exactly when `original_language`
// differs from the file's own `lang`, which is a rule spanning two levels of this document
// and belongs with the rest of the content rules rather than in a schema that can only see
// one object at a time.
const testimonialSchema = z.object({
  id: z.string(),
  quote: z.string(),
  excerpt: z.string().optional(),
  original_language: localeSchema,
  original_quote: z.string().optional(),
  name: z.string(),
  title: z.string(),
  company: z.string(),
  url: z.string(),
});

const testimonialsFrontmatterSchema = z.looseObject({
  slug: z.string(),
  lang: localeSchema,
  type: z.literal('testimonials'),
  title: z.string(),
  confidentiality: z.string(),
  testimonials: z.array(testimonialSchema),
});

// One technology as the author curated it. `file` is optional and its absence is a designed
// state rather than a gap: the chip renders its mark slot as a dot. Which file exists behind a
// declared name cannot be seen from here — the assets live outside this package — so that join
// and the cross-locale rules are asserted a layer down, where both halves are in view.
const technologySchema = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string().optional(),
});

const stackFrontmatterSchema = z.looseObject({
  slug: z.string(),
  lang: localeSchema,
  type: z.literal('stack'),
  title: z.string(),
  confidentiality: z.string(),
  stack: z.array(technologySchema),
});

// The loader's default id prefers frontmatter's own `slug` when present, and every
// entry here carries one — so the English and Spanish half of a pair would collide
// on the same id and one would silently overwrite the other in the store. The id is
// generated from the file path instead, which is unique per locale by construction;
// pairing across locales is the join this collection's consumers do on `slug`, never on this id.
const generateIdFromEntryPath = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

const pages = defineCollection({
  loader: glob({ pattern: '!(ui|testimonials|stack).{en,es}.md', base: '../resources/site', generateId: generateIdFromEntryPath }),
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

// A data file with no route of its own, in the same folder and of the same shape as the
// interface strings above — which is why the pages pattern excludes it by name too. The
// pair is allowed not to exist: until the author has transcribed the recommendations there
// is nothing to render, and an absent section is the correct output for absent content.
const testimonials = defineCollection({
  loader: glob({ pattern: 'testimonials.{en,es}.md', base: '../resources/site', generateId: generateIdFromEntryPath }),
  schema: testimonialsFrontmatterSchema,
});

// The technologies the home strip renders, curated rather than derived. The list used to be
// the deduplicated union of every case study's own stack, which is a different thing doing a
// different job well: that array is what a reader of one article needs to know about one
// project, so it carries standards, notations and practices alongside the technologies. Under
// a heading naming technologies, a third of it contradicted the heading.
const stack = defineCollection({
  loader: glob({ pattern: 'stack.{en,es}.md', base: '../resources/site', generateId: generateIdFromEntryPath }),
  schema: stackFrontmatterSchema,
});

export const collections = { pages, caseStudies, ui, testimonials, stack };

// deploy