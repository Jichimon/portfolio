const CATALOG_ENTRY_TYPES = ['case-study', 'platform'];

export function listCaseStudyEntriesForLang(entries, lang) {
  return entries
    .filter((entry) => entry.data.lang === lang && CATALOG_ENTRY_TYPES.includes(entry.data.type))
    .sort((a, b) => a.data.slug.localeCompare(b.data.slug));
}
