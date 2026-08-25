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
