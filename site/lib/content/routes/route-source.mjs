import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseFrontmatter } from 'yaml';

// The content tree, read the way the collection reads it, for consumers that run OUTSIDE
// Astro's Vite pipeline and therefore cannot import the gateway — `astro:content` is a
// virtual module only Astro's own dev and build processes resolve.
//
// Two of them exist: the Playwright smoke tier, which runs under plain Node, and the
// post-deploy route verifier, which runs from the repository root against a live URL. Both
// need the SAME route set, and this module is why there is one derivation rather than two.
// Two derivations that could disagree is the defect criterion 4 exists to prevent: a
// verifier enumerating routes differently from the suite is verifying something else.

// Stryker disable next-line Regex: dropping the leading ^ is equivalent here — `.+` absorbs
// any prefix, so the anchored and unanchored forms accept exactly the same set of filenames.
// The TRAILING $ is not equivalent and is killed by the `.md.bak` test.
const LOCALIZED_MARKDOWN = /^(.+)\.(en|es)\.md$/;
const PAGE_TYPE = 'page';
const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/**
 * One entry, in the shape the collection's own loader produces: `{ data }`.
 *
 * Throws naming the file when there is no frontmatter, rather than returning an entry whose
 * slug and lang are undefined — that shape reaches the route derivation, produces nothing,
 * and removes a page from the set with nothing reporting it.
 *
 * @param {string} filePath
 * @returns {{ data: { slug: string, lang: string, type: string } }}
 */
export function readFrontmatterEntry(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const frontmatterMatch = raw.match(FRONTMATTER_BLOCK);
  if (!frontmatterMatch) {
    throw new Error(`no frontmatter block found in ${filePath}`);
  }
  return { data: parseFrontmatter(frontmatterMatch[1]) };
}

/**
 * Every locale-suffixed markdown file in one directory, mirroring the two loaders
 * `content.config.ts` declares over the content roots.
 *
 * `excludeStem` drops one file by name. It is the raw reader: prefer `readPageEntries`
 * below for anything that wants pages, because a name is a roster and a roster is wrong the
 * day somebody adds the second file it does not know about.
 *
 * @param {string} dir
 * @param {string} [excludeStem]
 * @returns {Array<{ data: { slug: string, lang: string, type: string } }>}
 */
export function readLocalizedMarkdownEntries(dir, excludeStem) {
  const entries = [];
  for (const fileName of readdirSync(dir)) {
    const match = fileName.match(LOCALIZED_MARKDOWN);
    if (!match) continue;
    const [, stem] = match;
    if (excludeStem && stem === excludeStem) continue;
    entries.push(readFrontmatterEntry(join(dir, fileName)));
  }
  return entries;
}

/**
 * The pages in one directory, and only the pages.
 *
 * The content root holds page files beside data files that share its shape and its locale
 * suffix but are not pages and must never become routes — the interface strings, the
 * testimonial pair. What separates them is not their filename, it is the `type` they
 * declare, so that is what this reads. The previous form excluded one stem by name, which
 * was correct while exactly one such file existed and silently wrong the moment a second
 * one landed: it went on being a page as far as every consumer could tell.
 *
 * @param {string} dir
 * @returns {Array<{ data: { slug: string, lang: string, type: string } }>}
 */
export function readPageEntries(dir) {
  return readLocalizedMarkdownEntries(dir).filter((entry) => entry.data.type === PAGE_TYPE);
}
