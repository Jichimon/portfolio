import { buildLocalizedRoutePath } from '../content/routes/route-set.mjs';

const HOME_UNLOCALIZED_PATH = '/';

// The nav's structure, declared once as data: which items exist, their order, what
// kind each is, and what it targets. Labels are content and live in the interface
// strings collection, keyed by `key` — this module never carries display text.
// A route item carries the bare slug the content collection already knows, not a
// path: composing the path is the resolver's job, so no source file spells one out.
export const NAV_ITEMS = [
  { key: 'work', kind: 'anchor', target: '#work' },
  { key: 'about', kind: 'route', slug: 'about' },
  { key: 'experience', kind: 'route', slug: 'experience' },
  { key: 'writing', kind: 'reserved' },
  { key: 'architectures', kind: 'reserved' },
  { key: 'search', kind: 'reserved' },
  { key: 'contact', kind: 'anchor', target: '#contact' },
];

// The unambiguous "no link" value a reserved item resolves to. A reserved slot has
// no href at all, so callers compare against this rather than against '#' or ''.
export const NO_NAV_HREF = null;

export function resolveNavItemHref(navItem, { lang, isIndexPage }) {
  switch (navItem.kind) {
    case 'route':
      return buildLocalizedRoutePath(`/${navItem.slug}`, lang);
    case 'anchor':
      return isIndexPage ? navItem.target : buildLocalizedRoutePath(HOME_UNLOCALIZED_PATH, lang) + navItem.target;
    case 'reserved':
      return NO_NAV_HREF;
    default:
      throw new Error(`nav item "${navItem.key}" has an unrecognized kind "${navItem.kind}"`);
  }
}
