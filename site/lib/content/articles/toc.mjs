// Punctuation that has no place in a URL fragment. Unicode letters (`\p{L}`) are kept
// deliberately rather than stripped to ASCII: Spanish headings carry accented and
// tilded letters — `qué`, `haría`, `diseño` — that are part of the word, not decoration,
// and dropping them would produce a different word, not a merely uglier id. Unicode
// numbers (`\p{N}`) are kept for the same reason a heading like "3 phases" needs its digit.
const NON_FRAGMENT_CHARACTER_PATTERN = /[^\p{L}\p{N}\s-]+/gu;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const HYPHEN_RUN_PATTERN = /-+/g;
const LEADING_OR_TRAILING_HYPHEN_PATTERN = /^-+|-+$/g;

function slugifyHeadingText(text) {
  return text
    .toLowerCase()
    .replace(NON_FRAGMENT_CHARACTER_PATTERN, '')
    .trim()
    .replace(WHITESPACE_RUN_PATTERN, '-')
    .replace(HYPHEN_RUN_PATTERN, '-')
    .replace(LEADING_OR_TRAILING_HYPHEN_PATTERN, '');
}

// One id for a heading, given the ids already used earlier in the same document. The
// first heading with a given text keeps the bare slug; every later heading with the
// same text is suffixed `-2`, `-3`, ... in the order encountered — deterministic because
// it depends only on `idsAlreadyTaken`, never on anything outside this document.
// A heading whose text is punctuation only slugifies to nothing, and an empty id is
// an anchor nobody can link to. It falls back to a generic name rather than to the
// heading's position, so the id stays stable when a section is inserted above it.
const EMPTY_SLUG_FALLBACK = 'section';

export function deriveHeadingId(text, idsAlreadyTaken) {
  const base = slugifyHeadingText(text) || EMPTY_SLUG_FALLBACK;
  if (!idsAlreadyTaken.has(base)) {
    return base;
  }
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (idsAlreadyTaken.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

// One entry per `##` heading, taken from the same heading list the body renders (the
// [{ depth, slug, text }] array Astro's own heading-id pass returns) rather than from a
// second parse that could disagree with it. `###` carries no entry — the artboards give
// it none.
const TABLE_OF_CONTENTS_DEPTH = 2;

export function deriveTableOfContents(headings) {
  return headings
    .filter((heading) => heading.depth === TABLE_OF_CONTENTS_DEPTH)
    .map((heading) => ({ id: heading.slug, label: heading.text }));
}

// Assigns the ids the body renders. Astro's own heading-id pass runs afterwards, finds
// an id already present, keeps it, and reports it in the heading list a page reads back
// — which is what makes the table of contents above and the anchors in the body the same
// list rather than two derivations that can disagree.
//
// The taken-id set belongs to the plugin instance, and the instance to one document, so
// two articles that share a heading text get the same id rather than the second one
// being suffixed because of something in the first.
export function createHeadingIdsPlugin() {
  const idsAlreadyTaken = new Set();
  return {
    name: 'heading-ids',
    heading(node, ctx) {
      const id = deriveHeadingId(ctx.textContent(node), idsAlreadyTaken);
      idsAlreadyTaken.add(id);
      ctx.setProperty(node, 'data', { hProperties: { id } });
    },
  };
}
