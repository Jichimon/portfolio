// The masthead's row order, as the design draws it on both article archetypes. Declared
// rather than derived, and that is the deliberate half: WHICH rows appear is read off the
// entry, so an entry missing a value shows one row fewer with no edit here — but the order
// they appear in is a design decision, and the entry's own frontmatter key order must
// never leak into it.
const MASTHEAD_ROW_ORDER = ['role', 'context', 'period', 'outcome', 'stack'];
const STACK_JOIN_SEPARATOR = ' · ';

// An empty string, a whitespace-only string and an empty array all mean "no row" —
// a blank value is worse than an absent one.
function hasMastheadValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue.length > 0;
  if (typeof rawValue === 'string') return rawValue.trim().length > 0;
  return false;
}

export function buildArticleMasthead(data, article) {
  const rows = [];
  for (const key of MASTHEAD_ROW_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const rawValue = data[key];
    if (!hasMastheadValue(rawValue)) continue;
    const label = article[key];
    if (label === undefined) {
      throw new Error(`ui.article carries no label for masthead key "${key}", which the entry provides a value for`);
    }
    const value = Array.isArray(rawValue) ? rawValue.join(STACK_JOIN_SEPARATOR) : rawValue;
    rows.push({ key, label, value });
  }
  return rows;
}
