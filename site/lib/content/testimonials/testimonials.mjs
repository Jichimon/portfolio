const KNOWN_LOCALES = ['en', 'es'];

/**
 * A quote nobody has been able to copy exactly yet. The marker is matched at the START of
 * the quote rather than anywhere inside it, so a real recommendation that happens to use
 * those words in a sentence is not silently dropped from the page.
 */
export const NEEDS_INPUT_MARKER = '[NEEDS INPUT]';

/**
 * What an excerpt puts in place of the words it drops. Marked rather than silent: a cut a
 * reader cannot see is a sentence the recommender did not write, presented as one they did.
 */
export const ELISION_MARKER = '[…]';

/**
 * Line breaks and runs of spaces carry no meaning here — a YAML block folds them wherever
 * the file happened to wrap — so both sides are compared with whitespace flattened. Nothing
 * else is normalised: a curly apostrophe is a different character from a straight one, and
 * quietly treating them as equal would let an excerpt differ from the words on LinkedIn.
 */
function flattenWhitespace(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function testimonialsOf(entry) {
  return entry.data.testimonials ?? [];
}

function idsOf(entry) {
  return testimonialsOf(entry).map((testimonial) => testimonial.id);
}

/**
 * The list exists twice, once per locale, and nothing else in the pipeline holds both halves
 * at the same time. Two files that disagree render a column that is quietly different in one
 * language — every card plausible on its own, the set wrong — which is the failure mode the
 * case studies already learned the hard way about ordering.
 *
 * The id is the join, so the two files must agree on which ids exist AND on their sequence:
 * the order is content, and a reader in Spanish meeting the recommendations in a different
 * sequence is reading a different page.
 */
export function assertTestimonialIdsAgreeAcrossLocales(entries, locales = KNOWN_LOCALES) {
  const entryByLocale = new Map();
  for (const entry of entries) {
    const { lang } = entry.data;
    if (entryByLocale.has(lang)) {
      throw new Error(`the testimonials collection carries more than one entry for locale "${lang}"`);
    }
    entryByLocale.set(lang, entry);
  }

  for (const locale of locales) {
    if (!entryByLocale.has(locale)) {
      throw new Error(`the testimonials collection has no entry for locale "${locale}"`);
    }
  }

  for (const locale of locales) {
    const ids = idsOf(entryByLocale.get(locale));
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new Error(`testimonial id "${id}" is declared twice in locale "${locale}" — the id is the join between locales, and a repeated one makes it ambiguous`);
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
        throw new Error(`testimonial "${id}" is declared in locale "${referenceLocale}" and missing from "${locale}"`);
      }
    }
    for (const id of localeIds) {
      if (!referenceIds.includes(id)) {
        throw new Error(`testimonial "${id}" is declared in locale "${locale}" and missing from "${referenceLocale}"`);
      }
    }

    for (let position = 0; position < referenceIds.length; position += 1) {
      if (referenceIds[position] !== localeIds[position]) {
        throw new Error(`the locales declare the testimonials in a different order: position ${position + 1} is "${referenceIds[position]}" in "${referenceLocale}" and "${localeIds[position]}" in "${locale}"`);
      }
    }
  }
}

function isPlaceholder(testimonial) {
  return String(testimonial.quote ?? '').trimStart().startsWith(NEEDS_INPUT_MARKER);
}

/**
 * "The original is preserved", turned into something a build can refuse.
 *
 * Most of these recommendations are a translation in one locale or the other, and a
 * translation that presents itself as the original tells a reader something not quite true
 * while every check stays green. So the record has to be complete in BOTH directions: a
 * translation with no original has lost the words the recommender actually wrote, and a
 * native quote carrying an "original" claims a provenance it does not have, which would
 * render a translation note that is simply false.
 *
 * A placeholder is exempt. It is not yet a claim about anything, and demanding its original
 * would force the author to invent a second placeholder for text that does not exist.
 */
export function assertTranslationsCarryTheirOriginal(entryData, sourceName, locales = KNOWN_LOCALES) {
  for (const testimonial of entryData.testimonials ?? []) {
    const { id, original_language: originalLanguage, original_quote: originalQuote } = testimonial;

    if (!locales.includes(originalLanguage)) {
      throw new Error(`testimonial "${id}" in "${sourceName}" declares original_language "${originalLanguage}", which is not one of the published locales (${locales.join(', ')})`);
    }

    if (isPlaceholder(testimonial)) continue;

    const isTranslated = originalLanguage !== entryData.lang;
    const carriesOriginal = typeof originalQuote === 'string' && originalQuote.trim().length > 0;

    if (isTranslated && !carriesOriginal) {
      throw new Error(`testimonial "${id}" in "${sourceName}" is translated from "${originalLanguage}" and carries no original_quote — the words the recommender actually wrote would then exist nowhere in the repository`);
    }
    if (!isTranslated && carriesOriginal) {
      throw new Error(`testimonial "${id}" in "${sourceName}" was written in "${originalLanguage}", which is this file's own locale, yet carries an original_quote — one of the two is wrong, and the card would claim a translation that never happened`);
    }
  }
}

/**
 * The cards a locale actually renders.
 *
 * Two things are deliberately NOT here. The original text of a translated quote never
 * becomes card copy: it stays in the record and it is public at the permalink, which is what
 * preserving it asks for without doubling the length of every translated card. And the
 * separator between a title and a company is not built into either value — punctuation
 * carries nothing to translate, so a stylesheet draws it and no string has to exist for it.
 *
 * An entry still waiting on its words is dropped rather than rendered, so a marker cannot
 * reach a reader and the rest of the column ships anyway. An empty result is the signal the
 * caller needs to omit the block entirely.
 */
export function buildTestimonialCards(entryData) {
  return (entryData.testimonials ?? [])
    .filter((testimonial) => !isPlaceholder(testimonial))
    .map((testimonial) => {
      const card = {
        id: testimonial.id,
        // The excerpt IS the card's quote when one exists. The full text stays in the record
        // and is public at the permalink, so shortening the card never shortens the archive.
        quote: withoutSurroundingQuotationMarks(testimonial.excerpt ?? testimonial.quote),
        name: testimonial.name,
        title: testimonial.title,
        company: testimonial.company,
        url: testimonial.url,
      };
      if (testimonial.original_language !== entryData.lang) {
        card.translatedFrom = testimonial.original_language;
      }
      return card;
    });
}

/**
 * The anti-paraphrase check, and the reason an excerpt is a separate field rather than a
 * shortened quote.
 *
 * An excerpt is split on its elision marker, and every fragment must appear in the quote it
 * claims to come from. That turns "nothing is paraphrased into existence" from an
 * instruction someone has to remember into something the build refuses — and the error it
 * catches is the one nobody could catch by reading, a single swapped word inside a sentence
 * that still sounds exactly like the person who wrote it.
 *
 * What it cannot judge is whether the excerpt is REPRESENTATIVE. Three verbatim words can
 * misrepresent a paragraph, and no check will ever see that; it stays the author's call.
 */
/**
 * The characters a person reaches for when they write a quotation into a field that already
 * IS one. They are delimiters, never words: the recommender did not type them, the card
 * draws its own opening mark, and treating them as content would both fail the verbatim
 * check for punctuation and render two marks where the design has one. So they are stripped
 * from the ends of anything that becomes card copy, and from each fragment before it is
 * compared. Only the ends — a mark inside the text is the recommender's own.
 */
const QUOTATION_MARKS = `"'“”‘’«»`;

function withoutSurroundingQuotationMarks(text) {
  return String(text ?? '').trim().replace(new RegExp(`^[${QUOTATION_MARKS}]+|[${QUOTATION_MARKS}]+$`, 'g'), '').trim();
}

export function assertExcerptsAreVerbatim(entryData, sourceName) {
  for (const testimonial of entryData.testimonials ?? []) {
    const { id, excerpt } = testimonial;
    if (typeof excerpt !== 'string' || excerpt.trim().length === 0) continue;

    if (isPlaceholder(testimonial)) {
      throw new Error(`testimonial "${id}" in "${sourceName}" carries an excerpt while its quote is still a placeholder — there is nothing yet for the excerpt to be verbatim against`);
    }

    const flattenedQuote = flattenWhitespace(testimonial.quote);
    for (const fragment of excerpt.split(ELISION_MARKER)) {
      const flattenedFragment = withoutSurroundingQuotationMarks(flattenWhitespace(fragment));
      if (flattenedFragment.length === 0) continue;
      if (flattenedQuote.includes(flattenedFragment)) continue;

      // The fragment is delimited with arrows rather than quotes, because the likeliest
      // reason it failed is that it CONTAINS quotes, and a finding that puts one straight
      // inside its own delimiter is unreadable at the moment it is needed most.
      const delimited = `→ ${flattenedFragment} ←`;
      throw new Error(`testimonial "${id}" in "${sourceName}" has an excerpt that is not verbatim: ${delimited} does not appear in the quote it is taken from`);
    }
  }
}
