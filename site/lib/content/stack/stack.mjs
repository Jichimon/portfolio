const KNOWN_LOCALES = ['en', 'es'];

function stackOf(entry) {
  return entry.data.stack ?? [];
}

function idsOf(entry) {
  return stackOf(entry).map((technology) => technology.id);
}

/**
 * The list exists twice, once per locale, and nothing else in the pipeline holds both halves
 * at the same time. Two files that disagree render a strip that is quietly different in one
 * language — every chip plausible on its own, the set wrong.
 *
 * The id is the join, so the two files must agree on which ids exist AND on their sequence:
 * which technology a reader meets first is the author's decision, and a reader in the other
 * language meeting them in a different order is reading a different page.
 */
export function assertStackIdsAgreeAcrossLocales(entries, locales = KNOWN_LOCALES) {
  const entryByLocale = new Map();
  for (const entry of entries) {
    const { lang } = entry.data;
    if (entryByLocale.has(lang)) {
      throw new Error(`the stack collection carries more than one entry for locale "${lang}"`);
    }
    entryByLocale.set(lang, entry);
  }

  for (const locale of locales) {
    if (!entryByLocale.has(locale)) {
      throw new Error(`the stack collection has no entry for locale "${locale}"`);
    }
  }

  for (const locale of locales) {
    const seen = new Set();
    for (const id of idsOf(entryByLocale.get(locale))) {
      if (seen.has(id)) {
        throw new Error(`stack id "${id}" is declared twice in locale "${locale}" — the id is the join between locales, and a repeated one makes it ambiguous`);
      }
      seen.add(id);
    }
  }

  const [referenceLocale, ...otherLocales] = locales;
  const referenceIds = idsOf(entryByLocale.get(referenceLocale));
  for (const locale of otherLocales) {
    const localeIds = idsOf(entryByLocale.get(locale));

    for (const id of referenceIds) {
      if (!localeIds.includes(id)) {
        throw new Error(`stack entry "${id}" is declared in locale "${referenceLocale}" and missing from "${locale}"`);
      }
    }
    for (const id of localeIds) {
      if (!referenceIds.includes(id)) {
        throw new Error(`stack entry "${id}" is declared in locale "${locale}" and missing from "${referenceLocale}"`);
      }
    }

    // Stryker disable next-line EqualityOperator: reaching here means both locales hold the same
    // ids with no duplicates, so the two arrays are the same length; <= reads one past both and
    // compares undefined with undefined, which is false and throws nothing. Genuinely equivalent.
    for (let position = 0; position < referenceIds.length; position += 1) {
      if (referenceIds[position] !== localeIds[position]) {
        throw new Error(`the locales declare the stack in a different order: position ${position + 1} is "${referenceIds[position]}" in "${referenceLocale}" and "${localeIds[position]}" in "${locale}"`);
      }
    }
  }
}

const VIEW_BOX = /\sviewBox\s*=\s*"[^"]+"/;

/**
 * Every paint the document declares for itself, from attributes and from an embedded style
 * block alike. Read as "does this file decide its own colour", never as "does it match a list
 * of colour names" — a roster of named colours would pass the first one nobody wrote down,
 * and it would miss a gradient reference entirely.
 */
const DECLARED_PAINT = /\b(?:fill|stroke)\s*[=:]\s*"?'?\s*([^"';,)\s>]+)/g;
const INHERITED_PAINTS = new Set(['currentcolor', 'none', 'inherit', 'transparent', 'unset']);

/**
 * A mark is scaled into a small fixed box and painted by the chip around it. Both halves of
 * that sentence are things a file can silently refuse to do, and neither shows up as an error:
 *
 * without a viewBox there is no intrinsic coordinate system to scale, so the mark renders at
 * whatever size its own attributes claim and pushes the row apart; and a mark that names its
 * own colour keeps it in both themes, which is how a logo ends up invisible on one of them
 * and how a colour value ends up living outside the one stylesheet that is allowed to hold
 * one.
 *
 * So the rule is not "no colour" — it is "no colour of its own". A mark that names
 * currentColor is saying exactly the right thing out loud and passes.
 */
export function assertMarkIsRenderable(svgText, fileName) {
  if (!VIEW_BOX.test(svgText)) {
    throw new Error(`mark "${fileName}" declares no viewBox, so nothing can scale it into the mark box — it would render at its own size and break the row`);
  }

  for (const [, paint] of svgText.matchAll(DECLARED_PAINT)) {
    if (!INHERITED_PAINTS.has(paint.toLowerCase())) {
      throw new Error(`mark "${fileName}" paints itself with "${paint}" instead of inheriting the chip's colour, so it would keep that colour in both themes`);
    }
  }
}

/**
 * The chips a locale actually renders.
 *
 * The mark is optional and its absence is a designed state rather than a gap, so an entry
 * without one carries no mark key at all — the caller reads the absence, and never has to
 * distinguish "no mark" from "a mark that failed to load". A declared mark with nothing
 * behind it is the opposite case and throws: it is an author typo, and rendering the dot
 * instead would hide it behind a state that looks deliberate.
 */
export function buildStackItems(entryData, availableMarkNames) {
  return (entryData.stack ?? []).map((technology) => {
    const item = { id: technology.id, name: technology.name };
    if (technology.file === undefined) {
      return item;
    }
    if (!availableMarkNames.has(technology.file)) {
      throw new Error(`mark "${technology.file}", declared by stack entry "${technology.id}", has no asset behind it`);
    }
    return { ...item, markFile: technology.file };
  });
}
