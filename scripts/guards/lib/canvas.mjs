// Gate step 18's checkable logic, relocated out of docs/design/canvas/verify.mjs so it runs
// under something (`TASK 63`). verify.mjs carried ZERO test coverage of any kind: it sits
// outside both the guard-test glob (scripts/guards/**/*.test.mjs) and Stryker's mutate glob
// (scripts/guards/lib/**/*.mjs), so a test written beside it ran under nothing.
//
// Slice C1 moved FIVE of verify.mjs's seven checks here — the ones that derive what they
// assert from the artifact itself and survive a future redesign (P-13). The other two
// (section numbering: 2, 2b, 5, 6 — four checks in verify.mjs's own count) hardcoded literals
// specific to the current design version: CSS breakpoints, the theme attribute, chrome class
// names, and the copy-counting vocabulary. Relocating those as hardcoded literals would have
// locked today's design in as a hidden test dependency — a redesign would fail this gate
// because the design changed, not because anything broke.
//
// Slice C2 (below, from checkResponsiveContract onward) moves them here anyway, by first
// extracting every one of those literals into scripts/guards/guards.config.json's `canvas`
// key (P-13, applied to the guard's OWN inputs this time). Each of these four functions reads
// its literals from the `canvasCfg` argument — the `canvas` key, parsed — never from a value
// written into this file. A redesign edits guards.config.json and re-runs verify.mjs; it does
// not need to find or edit this file. Every failure message names the config path that
// produced the expected value, so the fix is "edit one line of config" rather than "go
// hunting in a guard".
//
// Every function here is PURE: it takes already-read text/data and returns findings as
// plain strings, matching verify.mjs's own `fails.push(msg)` convention exactly. The CLI
// still does every readFileSync/readdirSync/JSON.parse — these functions never touch disk.
//
// Comment stripping: every check here strips HTML comments from its input text before
// scanning it. Before this, only the unrelated copy-counting check (verify.mjs's own
// section 5, not moved here) stripped comments — every other check read raw HTML, including
// <!-- ... --> blocks. That means commenting out a section of an artboard while iterating on
// the design could trip the anchor check (a commented-out href="#foo" with no matching
// commented-out id="foo") for a reason that has nothing to do with a real defect.

/**
 * Strips HTML comments from text before a structural check reads it. Reused verbatim from
 * the regex verify.mjs's copy-counting check already used for the same purpose.
 */
export function stripComments(text) {
  return String(text).replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * Section 1 — registration is complete in both directions: every live file in src/ is named
 * in canvas.json and in local-preview.mjs, and every artboard canvas.json names exists as a
 * file in src/. Derived from the artifacts themselves, never a roster kept here (P-13).
 *
 * @param {string[]} files            every *.dc.html filename found in src/
 * @param {{file:string,page:string}[]} artboards  canvas.json's artboards array
 * @param {string} previewText        local-preview.mjs's source
 */
export function checkRegistration(files, artboards, previewText) {
  const fails = [];
  const preview = stripComments(previewText);
  const page = Object.fromEntries(artboards.map((a) => [a.file, a.page]));
  for (const f of files) {
    if (!page[f]) fails.push(`${f}: in src/ but not in canvas.json`);
    if (!preview.includes(`"${f}"`)) fails.push(`${f}: in src/ but not in local-preview.mjs`);
  }
  for (const a of artboards) {
    if (!files.includes(a.file)) fails.push(`${a.file}: in canvas.json but not in src/`);
  }
  return fails;
}

/**
 * Section 2c — a derived screen must equal what derive.mjs produces right now. A hand-edited
 * copy of a generated file is drift nothing else would surface.
 *
 * @param {Record<string,string>} derived  name -> content, derive()'s current output
 * @param {Record<string,string>} actual   name -> content, what is actually checked into src/
 */
export function checkDerivedScreens(derived, actual) {
  const fails = [];
  for (const [name, content] of Object.entries(derived)) {
    const a = stripComments(actual[name] ?? '');
    const d = stripComments(content);
    if (a !== d) {
      fails.push(`${name}: differs from derive.mjs output — run: node docs/design/canvas/derive.mjs`);
    }
  }
  return fails;
}

/**
 * Section 3 — every in-page anchor resolves to an id in the same file. This is how four home
 * tiles were found linking to #experience, a section that does not exist on home — looking
 * at the screen had not found it.
 *
 * @param {Record<string,string>} liveScreens  name -> content, every live screen (page or document)
 */
export function checkAnchors(liveScreens) {
  const fails = [];
  for (const [name, raw] of Object.entries(liveScreens)) {
    const s = stripComments(raw);
    const ids = new Set([...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of s.matchAll(/href="#([^"]+)"/g)) {
      if (!ids.has(m[1])) fails.push(`${name}: href="#${m[1]}" points at no id in this file`);
    }
  }
  return fails;
}

/**
 * Section 4 — locale hygiene: a Spanish (*ES.dc.html) screen never links to an unprefixed
 * (non-/es/) route, except the language switcher's own English target. An earlier version
 * excused every href="/" and that hid a real defect: the Spanish home's wordmark still
 * pointed at the English home, so clicking the name dropped you out of Spanish (P-14).
 *
 * @param {Record<string,string>} esScreens  name -> content, live *ES.dc.html screens only
 */
export function checkLocaleHygiene(esScreens) {
  const fails = [];
  for (const [name, raw] of Object.entries(esScreens)) {
    const s = stripComments(raw);
    // The ONLY link on a Spanish page allowed to leave /es/ is the switcher's EN target.
    const switcherEn = (s.match(/<div class="lang"[\s\S]*?<\/div>/) || [''])[0];
    for (const m of s.matchAll(/href="(\/[^"#]*)"/g)) {
      const h = m[1];
      if (h === '/' && switcherEn.includes('href="/"')) {
        const before = s.slice(0, m.index);
        if (before.lastIndexOf('<div class="lang"') > before.lastIndexOf('</div>')) continue;
      }
      if (!h.startsWith('/es/')) fails.push(`${name}: links to ${h}, which is the English route`);
    }
  }
  return fails;
}

/**
 * Section 7 — src/ and the design specification agree on the artboard set, in both
 * directions: every file in src/ is named in the brief, and every *.dc.html name the brief
 * mentions exists in src/. Both directions derived from the artifacts (P-13).
 *
 * @param {string[]} files    every *.dc.html filename found in src/
 * @param {string} specText   the design brief's source
 */
export function checkSpecAgreement(files, specText) {
  const fails = [];
  const spec = stripComments(specText);
  const named = new Set([...spec.matchAll(/\b[A-Za-z][A-Za-z0-9]*\.dc\.html\b/g)].map((m) => m[0]));
  for (const f of files) {
    if (!named.has(f)) fails.push(`${f}: exists in src/ but the design specification never names it`);
  }
  for (const n of named) {
    if (!files.includes(n)) fails.push(`the design specification names ${n}, which does not exist in src/`);
  }
  return fails;
}

// Slice C2 — the four literal-dependent checks, now config-driven. Every value they assert
// against the artboard text is read from `canvasCfg` (guards.config.json's `canvas` key),
// never written into this file, and every failure names the config path it came from.
const CONFIG_PATH = 'scripts/guards/guards.config.json';

/**
 * Section 2 — the responsive contract and the theme, on every live screen (page or document):
 * both @media breakpoints are declared, the theme attribute is wired, and no fixed width
 * floor has crept back into the <style> block. Every literal (the two breakpoints, the theme
 * attribute string, the width-floor pattern) is a property of the CURRENT design version, so
 * it is read from canvasCfg rather than hardcoded — a redesign edits guards.config.json.
 *
 * @param {Record<string,string>} liveScreens  name -> content, every live screen (page or document)
 * @param {object} canvasCfg  guards.config.json's `canvas` key, parsed
 */
export function checkResponsiveContract(liveScreens, canvasCfg) {
  const fails = [];
  const { medium, narrow } = canvasCfg.breakpoints;
  const mediumQuery = `@media (max-width: ${medium}px)`;
  const narrowQuery = `@media (max-width: ${narrow}px)`;
  const themeAttr = canvasCfg.themeAttr;
  const floorPattern = new RegExp(canvasCfg.fixedWidthFloorPattern);
  for (const [name, raw] of Object.entries(liveScreens)) {
    const s = stripComments(raw);
    if (!s.includes(mediumQuery)) {
      fails.push(`${name}: no medium breakpoint "${mediumQuery}" — declared at ${CONFIG_PATH} → canvas.breakpoints.medium`);
    }
    if (!s.includes(narrowQuery)) {
      fails.push(`${name}: no narrow breakpoint "${narrowQuery}" — declared at ${CONFIG_PATH} → canvas.breakpoints.narrow`);
    }
    if (floorPattern.test(s.split('</style>')[0])) {
      fails.push(`${name}: a fixed width floor is back (matches /${floorPattern.source}/ in <style>) — declared at ${CONFIG_PATH} → canvas.fixedWidthFloorPattern`);
    }
    if (!s.includes(themeAttr)) {
      fails.push(`${name}: theme not wired to "${themeAttr}" — declared at ${CONFIG_PATH} → canvas.themeAttr`);
    }
  }
  return fails;
}

/**
 * Section 2b — chrome, on pages only: the language switcher's class is present in the rail,
 * and the rail's own CSS collapses to `position: static` at the narrow breakpoint. Both class
 * names are a property of the CURRENT design version, so they are read from canvasCfg.chrome
 * rather than hardcoded — a redesign renaming a class edits guards.config.json.
 *
 * @param {Record<string,string>} pages  name -> content, live pages only (not documents)
 * @param {object} canvasCfg  guards.config.json's `canvas` key, parsed
 */
export function checkPageChrome(pages, canvasCfg) {
  const fails = [];
  const langClass = canvasCfg.chrome.langSwitcherClass;
  const railPattern = new RegExp(canvasCfg.chrome.railStaticSelectorPattern);
  for (const [name, raw] of Object.entries(pages)) {
    const s = stripComments(raw);
    if (!s.includes(`class="${langClass}"`)) {
      fails.push(`${name}: no language switcher in the rail (expected class="${langClass}") — declared at ${CONFIG_PATH} → canvas.chrome.langSwitcherClass`);
    }
    if (!railPattern.test(s)) {
      fails.push(`${name}: rail does not collapse at narrow (expected to match /${railPattern.source}/) — declared at ${CONFIG_PATH} → canvas.chrome.railStaticSelectorPattern`);
    }
  }
  return fails;
}

/**
 * Section 5 — no visible copy states how many of a growing thing there are. Every list on
 * this site is expected to grow (case studies, deep dives, employers, testimonials,
 * technologies); a number next to one of those words goes stale the day the list grows, and
 * nothing else would catch it. Scoped to the SENTENCE, not to word distance — "Three specific
 * problems within it are documented as separate case studies" hides four words between the
 * number and the noun, and a proximity rule would have waved it through.
 *
 * Two hard-won exclusions, both config-driven so a redesign or a copy-vocabulary change can
 * adjust either without touching this file:
 *   - a four-digit year (canvasCfg.yearExclusionPattern) is stripped before the count check —
 *     a period is a fact about the past and does not grow.
 *   - "one"/"uno" are deliberately ABSENT from canvasCfg.countsVocabulary. They read as
 *     rhetorical here ("one recurring problem") rather than as a count of a growing list, and
 *     including them previously produced a false positive on real copy.
 *
 * @param {Record<string,string>} pages  name -> content, live pages only (not documents)
 * @param {object} canvasCfg  guards.config.json's `canvas` key, parsed
 */
export function checkGrowingCounts(pages, canvasCfg) {
  const fails = [];
  const grows = new RegExp(`(${canvasCfg.growsVocabulary.join('|')})`, 'i');
  const counts = new RegExp(`\\b(${canvasCfg.countsVocabulary.join('|')}|\\d+)\\b`, 'i');
  const years = new RegExp(canvasCfg.yearExclusionPattern, 'g');
  for (const [name, raw] of Object.entries(pages)) {
    const s = stripComments(raw);
    // visible copy only — strip the <style> block and every tag
    const copy = s.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
    for (const sentence of copy.split(/(?<=[.!?])\s+|\n/)) {
      if (!grows.test(sentence)) continue;
      const bare = sentence.replace(years, ' ').replace(/\d[\d.,]*s?\b/g, ' ');
      const m = bare.match(counts);
      if (m) {
        const excerpt = sentence.trim().replace(/\s+/g, ' ').slice(0, 90);
        fails.push(
          `${name}: copy counts a growing thing — "${m[0]}" in "${excerpt}" — ` +
          `declared at ${CONFIG_PATH} → canvas.growsVocabulary / canvas.countsVocabulary`,
        );
      }
    }
  }
  return fails;
}

/**
 * Section 6 — the switcher's target is this page in the other language, never a bare home:
 * every page (except one exempted by canvasCfg.switcherExcluded) carries a language-switcher
 * block, and that block marks which locale is current. Both class names are a property of
 * the CURRENT design version, read from canvasCfg.chrome rather than hardcoded.
 *
 * @param {Record<string,string>} pages  name -> content, live pages only (not documents)
 * @param {object} canvasCfg  guards.config.json's `canvas` key, parsed
 */
export function checkSwitcherCurrentLocale(pages, canvasCfg) {
  const fails = [];
  const langClass = canvasCfg.chrome.langSwitcherClass;
  const curClass = canvasCfg.chrome.currentLocaleClass;
  const excluded = new Set(canvasCfg.switcherExcluded ?? []);
  const blockPattern = new RegExp(`<div class="${langClass}"[\\s\\S]*?<\\/div>`);
  const curPattern = new RegExp(`class="${curClass}"`);
  for (const [name, raw] of Object.entries(pages)) {
    if (excluded.has(name)) continue; // designed to have no current locale
    const s = stripComments(raw);
    const m = s.match(blockPattern);
    if (!m) {
      fails.push(`${name}: language switcher block not found (expected a class="${langClass}" block) — declared at ${CONFIG_PATH} → canvas.chrome.langSwitcherClass`);
      continue;
    }
    if (!curPattern.test(m[0])) {
      fails.push(`${name}: no current locale marked in the switcher (expected class="${curClass}") — declared at ${CONFIG_PATH} → canvas.chrome.currentLocaleClass`);
    }
  }
  return fails;
}
