// C-09 and C-14, which until step 12's acceptance run were rung-2 claims with nothing behind
// them. Both rule rows read "in the gate"; neither guard existed. That is a false lock, and
// the architecture is explicit that a false 🔒 is worse than an honest 🔧, because it retires
// a human eye that is still needed.
//
// Two properties, and they protect the surface where this repository's own incidents live:
//
//   PARITY      every locale-suffixed file has its counterpart, and the pair shares one slug.
//               The slug is the i18n join key, so a mismatch is a page that cannot be linked
//               across locales rather than a cosmetic inconsistency.
//   FRONTMATTER the keys a page declares are the keys its type requires.
//
// The required key set is DERIVED FROM THE TYPE the file declares, not from one flat list.
// C-14 originally stated a single list for all content, which described no file in the
// repository: a `page` carries five keys, a `case-study` carries twelve. A guard built from
// the rule as written would have failed all eight pages on day one and been switched off.

const FM = /^---\r?\n([\s\S]*?)\r?\n---/;
const LOCALE = /\.([a-z]{2})\.md$/;

/** The locale a filename claims, or null when it claims none. */
export function localeOf(path) {
  return (String(path).match(LOCALE) ?? [])[1] ?? null;
}

/** The join key: the filename with its locale suffix and extension removed. */
export function pairKey(path) {
  const p = String(path).split('\\').join('/');
  return p.replace(LOCALE, '').replace(/\.md$/, '');
}

/**
 * Frontmatter keys and scalar values. Deliberately not a YAML parser — the checks below need
 * key presence and three scalars, and a dependency for that would be the tail wagging the dog.
 */
export function parseFrontmatter(text) {
  const m = String(text).match(FM);
  if (!m) return null;
  const keys = [];
  const values = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([a-z_][a-z0-9_]*):(.*)$/i);
    if (!k) continue;
    keys.push(k[1]);
    values[k[1]] = k[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return { keys, values };
}

const exempt = (path, list) => list.some((e) => path === e.path);

/**
 * Exemptions are validated against the WHOLE tree, separately from the per-file checks.
 *
 * Kept apart deliberately: folding it into `checkFrontmatter` made every fixture-sized call
 * report the real config's exemptions as stale, because a two-file fixture contains neither
 * of them. A check whose verdict depends on how much of the world the caller happened to
 * pass is a check that will be wrong somewhere.
 */
export function validateExemptions(allFiles, config = {}) {
  const findings = [];
  for (const e of [...(config.noFrontmatter ?? []), ...(config.singleLocale ?? [])]) {
    if (!(e.reason ?? '').trim()) {
      findings.push({ file: 'guards.config.json', message: `${e.path} is exempt with no reason recorded — every calibrated exception here carries one` });
    }
    if (!allFiles.some((f) => f.path === e.path)) {
      findings.push({ file: 'guards.config.json', message: `${e.path} is exempt but does not exist — a stale exemption hides the next real gap` });
    }
  }
  return findings;
}

/**
 * C-09. Locale parity, checked as a property of the pair rather than a count.
 *
 * A count would pass on nine English and nine Spanish files that pair with nothing.
 */
export function checkParity(files, config = {}) {
  const findings = [];
  const exemptions = config.singleLocale ?? [];
  const pairs = new Map();

  for (const { path } of files) {
    const locale = localeOf(path);
    if (!locale) continue;
    const key = pairKey(path);
    if (!pairs.has(key)) pairs.set(key, new Map());
    pairs.get(key).set(locale, path);
  }

  const required = config.locales ?? ['en', 'es'];

  for (const [key, byLocale] of pairs) {
    for (const locale of required) {
      if (byLocale.has(locale)) continue;
      const present = [...byLocale.values()][0];
      if (exempt(present, exemptions)) continue;
      findings.push({
        file: present,
        message: `has no ${locale} counterpart (${key}.${locale}.md). The Spanish is first-class content, not a translation artifact, and a page that exists in one locale is a page the other locale cannot link to (C-09)`,
      });
    }
  }

  // The slug is the join key. Two files pairing by FILENAME while declaring different slugs
  // is worse than a missing counterpart, because it looks correct in a directory listing.
  for (const [key, byLocale] of pairs) {
    const slugs = new Map();
    for (const [locale, path] of byLocale) {
      const fm = files.find((f) => f.path === path)?.frontmatter;
      if (fm?.values?.slug) slugs.set(locale, fm.values.slug);
    }
    const distinct = new Set(slugs.values());
    if (distinct.size > 1) {
      findings.push({
        file: `${key}.*.md`,
        message: `the locales declare different slugs (${[...slugs].map(([l, s]) => `${l}: ${s}`).join(', ')}). The slug is the i18n join key — two values mean the pair cannot be joined (C-14)`,
      });
    }
  }

  return findings;
}

/**
 * C-14. Frontmatter shape, keyed on the declared `type`.
 *
 * @param {{path:string,frontmatter:object|null}[]} files
 * @param {object} config  .universal, .byType, .noFrontmatter (each exemption carrying a reason)
 */
export function checkFrontmatter(files, config = {}) {
  const findings = [];
  const universal = config.universal ?? [];
  const byType = config.byType ?? {};
  const exemptions = config.noFrontmatter ?? [];

  for (const { path, frontmatter } of files) {
    if (!frontmatter) {
      if (!exempt(path, exemptions)) {
        findings.push({ file: path, message: 'has no frontmatter, and is not one of the recorded exemptions (C-14)' });
      }
      continue;
    }

    const { keys, values } = frontmatter;
    const missing = universal.filter((k) => !keys.includes(k));
    if (missing.length) {
      findings.push({ file: path, message: `missing required key(s): ${missing.join(', ')} (C-14)` });
    }

    const type = values.type;
    if (type && byType[type]) {
      const missingForType = byType[type].filter((k) => !keys.includes(k));
      if (missingForType.length) {
        findings.push({ file: path, message: `type "${type}" requires ${missingForType.join(', ')}, which are absent (C-14)` });
      }
    } else if (type && Object.keys(byType).length && !byType[type]) {
      // An unknown type is reported rather than waved through: it is either a typo or a new
      // content shape nobody has decided the required keys for, and both need a human (P-13).
      findings.push({ file: path, message: `declares type "${type}", which has no required-key set — either a typo or a shape nobody has specified` });
    }

    const locale = localeOf(path);
    if (locale && values.lang && values.lang !== locale) {
      findings.push({ file: path, message: `filename says .${locale}.md but frontmatter says lang: ${values.lang}` });
    }
    if (values.slug && pairKey(path).split('/').pop() !== values.slug) {
      findings.push({ file: path, message: `slug "${values.slug}" disagrees with the filename. The slug is a public route and two names for one page is how a link goes stale` });
    }
  }

  return findings;
}
