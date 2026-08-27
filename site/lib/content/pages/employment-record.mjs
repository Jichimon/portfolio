export function buildEmploymentRecord(roles, caseStudyEntries, routes, lang, sourceName) {
  return roles.map((role, index) =>
    buildEmploymentRecordEntry(role, index === 0, caseStudyEntries, routes, lang, sourceName),
  );
}

function buildEmploymentRecordEntry(role, isMostRecent, caseStudyEntries, routes, lang, sourceName) {
  const { company, period, title, body, stack, logo, case_studies: caseStudySlugs } = role;

  const entry = {
    company,
    period,
    title,
    paragraphs: body,
    isMostRecent,
  };

  if (stack !== undefined) {
    entry.stack = stack;
  }

  if (logo !== undefined) {
    entry.logo = logo;
  }

  if (caseStudySlugs !== undefined) {
    entry.caseStudyRows = caseStudySlugs.map((slug) =>
      buildCaseStudyRow(slug, caseStudyEntries, routes, lang, sourceName),
    );
  }

  return entry;
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
