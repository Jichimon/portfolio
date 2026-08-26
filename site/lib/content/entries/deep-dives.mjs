// The platform body's own "## Deep dives" section, found structurally rather than by
// heading text — the Spanish body writes that heading in English today, so a text-keyed
// rule would look correct and quietly break the day someone translates it. The untranslated
// heading is a recorded content finding, owned elsewhere and deliberately not fixed here.
const DEEP_DIVE_LINK_PATTERN = /^\/case-studies\/([^/]+)$/;

function isH2(node) {
  return node?.type === 'heading' && node.depth === 2;
}

function isList(node) {
  return node?.type === 'list';
}

// A deep-dive item is a listItem whose only child is a paragraph whose only child is a
// link to an internal /case-studies/<slug> path. The services list, for contrast, opens
// with `strong` then a text node — its items fail this check, which is the whole point
// of keying the section on structure instead of position or text.
function deepDiveSlugFromListItem(item) {
  if (item?.type !== 'listItem') return null;
  const itemChildren = item.children ?? [];
  if (itemChildren.length !== 1) return null;
  const [paragraphNode] = itemChildren;
  if (paragraphNode?.type !== 'paragraph') return null;
  const paragraphChildren = paragraphNode.children ?? [];
  if (paragraphChildren.length !== 1) return null;
  const [linkNode] = paragraphChildren;
  if (linkNode?.type !== 'link') return null;
  const match = DEEP_DIVE_LINK_PATTERN.exec(linkNode.url ?? '');
  return match ? match[1] : null;
}

function slugsIfEveryItemIsADeepDiveLink(listNode) {
  const items = listNode.children ?? [];
  if (items.length === 0) return null;
  const slugs = [];
  for (const item of items) {
    const slug = deepDiveSlugFromListItem(item);
    if (slug === null) return null;
    slugs.push(slug);
  }
  return slugs;
}

function locateDeepDivesSection(children) {
  for (let index = 0; index < children.length - 1; index += 1) {
    const heading = children[index];
    const list = children[index + 1];
    if (!isH2(heading) || !isList(list)) continue;
    const slugs = slugsIfEveryItemIsADeepDiveLink(list);
    if (slugs) {
      return { headingIndex: index, listIndex: index + 1, slugs };
    }
  }
  return null;
}

// Returns the slugs named by the platform body's deep-dives section, and the body with
// that section's heading and list removed — so the caller never renders the section
// twice (once as the grid, once as the plain list underneath). A body with no such
// section returns an empty slug list and the body unchanged, which is the normal case:
// all four case-study bodies hit this path.
export function extractDeepDives(children) {
  const section = locateDeepDivesSection(children);
  if (!section) {
    return { slugs: [], body: children };
  }
  const { headingIndex, listIndex, slugs } = section;
  const body = children.filter((_, index) => index !== headingIndex && index !== listIndex);
  return { slugs, body };
}

function joinRoleAndPeriod(role, period) {
  if (role !== undefined && period !== undefined) return `${role} · ${period}`;
  return role ?? period;
}

// Joins the deep-dive slugs against the real entries and the route set for one locale.
// The card's copy comes from the linked entry's OWN frontmatter, never from the markdown
// link text — they agree today, and the frontmatter is the one that stays correct if a
// title changes. The href comes from the route set, never from the href written in the
// markdown: both locales write the same /case-studies/<slug> href, and rendering it
// literally would send a Spanish reader to the English page.
export function buildDeepDiveCards(slugs, entries, routes) {
  return slugs.map((slug) => buildCard(slug, entries, routes));
}

function buildCard(slug, entries, routes) {
  const entry = entries.find((candidate) => candidate.data.slug === slug);
  if (!entry) {
    throw new Error(`deep dive links to slug "${slug}" which has no entry`);
  }
  const route = routes.find((candidate) => candidate.slug === slug);
  if (!route) {
    throw new Error(`deep dive links to slug "${slug}" which has no route`);
  }
  const { title, role, period } = entry.data;
  return { title, meta: joinRoleAndPeriod(role, period), href: route.path };
}

// The inverse of the same extracted list: given a summary per platform (its slug, its
// title, and the child slugs its own deep-dives section names), returns a lookup a
// case-study page can ask "which platform, if any, names me?" and get back the parent's
// title, or nothing. No frontmatter carries this relation and none can be added,
// so it is computed once here rather than derived from `type` — `type: platform` says a
// page IS a parent, never OF WHAT.
export function buildParentTitleLookup(platformSummaries) {
  const parentTitleBySlug = new Map();
  for (const platform of platformSummaries) {
    for (const childSlug of platform.childSlugs) {
      parentTitleBySlug.set(childSlug, platform.title);
    }
  }
  return (slug) => parentTitleBySlug.get(slug);
}
