// availableLogoNames defaults to empty rather than "no check": a caller that forgets to pass
// the real set gets every declared logo refused rather than every declared logo waved
// through, which is the safer of the two failure directions when validation is skipped by
// accident — a check that cannot evaluate should deny, not wave through.
//
// availableDarkLogoNames defaults to empty too, but for the opposite reason: a dark variant
// is an enhancement, never a requirement, so an unset argument means "assume none exist"
// rather than "skip the check" — the ordinary, fully-supported state for every logo that
// has no themed sibling.
export function buildEmploymentRecord(
  roles,
  caseStudyEntries,
  routes,
  lang,
  sourceName,
  availableLogoNames = new Set(),
  availableDarkLogoNames = new Set(),
) {
  const entries = roles.map((role, index) =>
    buildEmploymentRecordEntry(
      role,
      index === 0,
      caseStudyEntries,
      routes,
      lang,
      sourceName,
      availableLogoNames,
      availableDarkLogoNames,
    ),
  );
  assertNoAnchorCollision(entries, sourceName);
  return entries;
}

// Two stints at one employer is a real shape this record can hold, and a reader clicking
// the second card and silently landing on the first is a broken promise no test would
// catch — so a collision fails the build, naming both roles, rather than auto-suffixing
// or overwriting one silently. An anchor-less entry (an unusable company name) never
// collides with anything: it carries no fragment for a reader to land on either way.
function assertNoAnchorCollision(entries, sourceName) {
  const companyByAnchor = new Map();
  for (const entry of entries) {
    if (entry.anchor === undefined) continue;
    const previousCompany = companyByAnchor.get(entry.anchor);
    if (previousCompany !== undefined) {
      throw new Error(
        `roles "${previousCompany}" and "${entry.company}" in "${sourceName}" both derive the anchor "${entry.anchor}"`,
      );
    }
    companyByAnchor.set(entry.anchor, entry.company);
  }
}

function buildEmploymentRecordEntry(
  role,
  isMostRecent,
  caseStudyEntries,
  routes,
  lang,
  sourceName,
  availableLogoNames,
  availableDarkLogoNames,
) {
  const { company, period, title, body, stack, logo, case_studies: caseStudySlugs } = role;

  const entry = {
    company,
    period,
    title,
    paragraphs: body,
    isMostRecent,
  };

  const anchor = deriveAnchor(company);
  if (anchor !== undefined) {
    entry.anchor = anchor;
  }

  if (stack !== undefined) {
    entry.stack = stack;
  }

  if (logo !== undefined) {
    if (!availableLogoNames.has(logo)) {
      throw new Error(`logo "${logo}", declared by role "${company}", has no asset behind it`);
    }
    entry.logo = logo;

    const darkLogoFileName = deriveDarkLogoFileName(logo);
    if (availableDarkLogoNames.has(darkLogoFileName)) {
      entry.logoDark = darkLogoFileName;
    }
  }

  if (caseStudySlugs !== undefined) {
    entry.caseStudyRows = caseStudySlugs.map((slug) =>
      buildCaseStudyRow(slug, caseStudyEntries, routes, lang, sourceName),
    );
  }

  return entry;
}

// A deep-link anchor derived from `company` alone — no locale, no role object, no index —
// so the same company name always produces the same fragment. Diacritics fold rather than
// escape (Avícola Sofía -> avicola-sofia): a percent-encoded fragment is not one a reader
// can read or type. NFD splits an accented letter into base + combining mark (e.g. i +
// U+0301 combining acute), so stripping the U+0300-U+036F combining-diacritics block after
// normalize('NFD') leaves the base letter and drops the accent, rather than dropping the
// letter entirely. Punctuation collapses to a single hyphen per run rather than stripping
// known legal suffixes ("S.A.", "Inc.", "Ltd."): that list only ever covers the suffixes
// someone thought to write down, and the ugly-but-derivable id beats one that silently
// breaks on the first employer whose suffix nobody listed. A name with no letter or digit
// in it (whitespace-only, punctuation-only) reduces to the empty string, and that returns
// undefined rather than '': a card linking to '#' is worse than one linking to the page.
const COMBINING_DIACRITIC_RANGE = /[\u0300-\u036f]/g;

export function deriveAnchor(company) {
  const collapsed = company
    .normalize('NFD')
    .replace(COMBINING_DIACRITIC_RANGE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  // Stryker disable next-line Regex: both `-+` alternatives are equivalent to `-` here — the
  // run-collapse above already guarantees no two hyphens are ever adjacent by the time this
  // line runs, so the longest leading or trailing run this regex can ever see is one
  // character. No input reaches this line with a real run of hyphens for `+` to matter.
  const slug = collapsed.replace(/^-+|-+$/g, '');
  return slug === '' ? undefined : slug;
}

const DARK_LOGO_SUFFIX = '-dark';

// The sibling-file convention: <basename>.svg's dark-theme variant is <basename>-dark.svg,
// same folder, same publication boundary. A pure string derivation — whether the derived
// name actually exists as an asset is answered by the caller, against a real glob of the
// folder, never assumed here.
export function deriveDarkLogoFileName(logoFileName) {
  const dotIndex = logoFileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${logoFileName}${DARK_LOGO_SUFFIX}`;
  }
  return `${logoFileName.slice(0, dotIndex)}${DARK_LOGO_SUFFIX}${logoFileName.slice(dotIndex)}`;
}

// The adapter from a role list to the {file} shape assertEveryAssetIsReferenced already
// expects (published-photos.mjs), so the employer marks' publication-boundary check — an
// asset in the employer logo folder that no role references — reuses that function verbatim
// rather than forking a second copy of the same "asset -> reference" logic.
export function collectDeclaredLogoFiles(roles) {
  return roles.filter((role) => role.logo !== undefined).map((role) => ({ file: role.logo }));
}

function buildCaseStudyRow(slug, caseStudyEntries, routes, lang, sourceName) {
  const linkedEntry = caseStudyEntries.find(
    (entry) => entry.data.slug === slug && entry.data.lang === lang,
  );
  if (!linkedEntry) {
    throw new Error(
      `role in "${sourceName}" references case study "${slug}", which has no entry in "${lang}"`,
    );
  }

  const linkedRoute = routes.find((route) => route.slug === slug && route.lang === lang);
  if (!linkedRoute) {
    throw new Error(
      `role in "${sourceName}" references case study "${slug}", which has no route in "${lang}"`,
    );
  }

  return { title: linkedEntry.data.title, href: linkedRoute.path };
}
