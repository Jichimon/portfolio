const CATALOG_ENTRY_TYPES = ['case-study', 'platform'];

export function listCaseStudyEntriesForLang(entries, lang) {
  const matchingEntries = entries.filter(
    (entry) => entry.data.lang === lang && CATALOG_ENTRY_TYPES.includes(entry.data.type),
  );

  matchingEntries.forEach(requireOrder);
  assertNoDuplicateOrder(matchingEntries);

  return matchingEntries.slice().sort((a, b) => a.data.order - b.data.order);
}

function requireOrder(entry) {
  if (typeof entry.data.order !== 'number') {
    throw new Error(`case study "${entry.data.slug}" is missing a required "order" value`);
  }
}

function assertNoDuplicateOrder(matchingEntries) {
  const slugByOrder = new Map();
  for (const entry of matchingEntries) {
    const { order, slug } = entry.data;
    const previousSlug = slugByOrder.get(order);
    if (previousSlug !== undefined) {
      throw new Error(`case studies "${previousSlug}" and "${slug}" share the order value ${order}`);
    }
    slugByOrder.set(order, slug);
  }
}

export function listCaseStudyStackForLang(entries, lang) {
  const matchingEntries = entries.filter(
    (entry) => entry.data.lang === lang && CATALOG_ENTRY_TYPES.includes(entry.data.type),
  );

  const stackValuesSeen = new Set();
  for (const entry of matchingEntries) {
    const stackValues = entry.data.stack ?? [];
    for (const stackValue of stackValues) {
      stackValuesSeen.add(stackValue);
    }
  }

  return [...stackValuesSeen];
}

// The bento's three tile shapes, derived from the content rather than assigned by a
// page. A platform entry anchors the featured group; its featured siblings are
// numbered in published order; a non-featured entry stands alone below the label.
// All three follow from `type` and `featured`, which every entry already carries —
// so a sixth case study lands in the right shape with no template edit, which is the
// property this page is judged on.
export function deriveHomeTiles(entries, lang) {
  const ordered = listCaseStudyEntriesForLang(entries, lang);

  const featured = [];
  const standalone = [];
  let nextPosition = 1;

  for (const entry of ordered) {
    const tile = toTile(entry);
    if (!entry.data.featured) {
      standalone.push({ ...tile, variant: 'full' });
    } else if (entry.data.type === 'platform') {
      featured.push({ ...tile, variant: 'anchor' });
    } else {
      featured.push({ ...tile, variant: 'numbered', positionNumber: nextPosition });
      nextPosition += 1;
    }
  }

  return { featured, standalone };
}

// `scale` belongs to a platform and `outcome` to a case study, and no entry carries
// both — so the tile takes whichever exists and the component omits the element for
// the one that does not.
function toTile(entry) {
  const { slug, title, subtitle, role, period, scale, scale_caption, outcome } = entry.data;
  return {
    slug,
    title,
    summaryText: subtitle,
    scaleFigure: scale,
    scaleCaption: scale_caption,
    roleLine: role,
    highlightLine: joinHighlight(outcome, period),
  };
}

// The highlight was `outcome ?? period`, which silently dropped the year from every
// entry that had both — four of the five, and the design shows the year on all of
// them. A coalesce reads as a fallback and behaves as a filter; the two are only the
// same when at most one side is ever present, which was never true here.
function joinHighlight(outcome, period) {
  if (outcome !== undefined && period !== undefined) return `${outcome} · ${period}`;
  return outcome ?? period;
}
