const KNOWN_LOCALES = ['en', 'es'];

export function findEntryBySlugAndLang(entries, slug, lang) {
  const matches = entries.filter((entry) => entry.data.slug === slug && entry.data.lang === lang);
  if (matches.length === 0) {
    throw new Error(`no entry found for slug "${slug}" in locale "${lang}"`);
  }
  if (matches.length > 1) {
    throw new Error(`slug "${slug}" is duplicated within locale "${lang}"`);
  }
  return matches[0];
}

export function findAlternateLocaleEntry(entries, entry) {
  const alternateLang = KNOWN_LOCALES.find((locale) => locale !== entry.data.lang);
  return findEntryBySlugAndLang(entries, entry.data.slug, alternateLang);
}

export function assertEverySlugHasBothLocales(entries, locales = KNOWN_LOCALES) {
  const entriesBySlug = new Map();
  for (const entry of entries) {
    const group = entriesBySlug.get(entry.data.slug) ?? [];
    group.push(entry);
    entriesBySlug.set(entry.data.slug, group);
  }

  for (const [slug, group] of entriesBySlug) {
    for (const locale of locales) {
      const inLocale = group.filter((entry) => entry.data.lang === locale);
      if (inLocale.length > 1) {
        throw new Error(`slug "${slug}" is duplicated within locale "${locale}"`);
      }
    }

    const presentLocales = locales.filter((locale) => group.some((entry) => entry.data.lang === locale));
    if (presentLocales.length === 0) {
      throw new Error(`slug "${slug}" has no entry in any of its expected locales (${locales.join(', ')})`);
    }
    if (presentLocales.length < locales.length) {
      const missingLocales = locales.filter((locale) => !presentLocales.includes(locale));
      throw new Error(`slug "${slug}" is present only in "${presentLocales.join(', ')}", missing "${missingLocales.join(', ')}"`);
    }
  }
}

// The catalog listing sees one locale at a time, so it can prove that locale's own
// order is complete and unique and still miss the case where the two halves of a pair
// disagree — which renders the same list in two different sequences, each internally
// plausible. This is the only function that holds both halves at once, so the check
// belongs here rather than in the listing that consumes the result.
export function assertEveryPairAgreesOnOrder(entries, locales = KNOWN_LOCALES) {
  const orderByLocaleBySlug = new Map();
  for (const entry of entries) {
    const { slug, lang, order } = entry.data;
    if (typeof order !== 'number') continue;
    const orderByLocale = orderByLocaleBySlug.get(slug) ?? new Map();
    orderByLocale.set(lang, order);
    orderByLocaleBySlug.set(slug, orderByLocale);
  }

  for (const [slug, orderByLocale] of orderByLocaleBySlug) {
    const [firstLocale, ...remainingLocales] = locales.filter((locale) => orderByLocale.has(locale));
    for (const locale of remainingLocales) {
      if (orderByLocale.get(locale) !== orderByLocale.get(firstLocale)) {
        throw new Error(
          `slug "${slug}" carries order ${orderByLocale.get(firstLocale)} in "${firstLocale}" and ${orderByLocale.get(locale)} in "${locale}"`,
        );
      }
    }
  }
}
