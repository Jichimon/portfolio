import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFileCap,
  checkGatewayBoundary,
  checkCoreIsFrameworkFree,
  checkCommentsCarryNoExternalReference,
  checkRouteLiteralsAreDerived,
  checkColourAndBreakpointLiteralsAreDeclaredOnce,
  checkVisibleStringLiteralsComeFromTheGateway,
  checkConfigsDeclareRatherThanAct,
  checkSite,
} from './site-structure.mjs';

const CFG = { maxFilesPerDir: 6, maxFilesPerPackageRoot: 10, gateway: 'site/src/gateway', core: 'site/lib' };

const files = (...paths) => paths.map((path) => ({ path, text: '' }));
const filled = (path, text) => ({ path, text });

// ── S-03 · the file cap ──────────────────────────────────────────────────────

test('a directory under the cap produces no finding', () => {
  const r = checkFileCap(files(...Array.from({ length: 6 }, (_, i) => `site/src/components/c${i}.astro`)), CFG);
  assert.deepEqual(r, []);
});

test('RED: a directory at seven files is a finding', () => {
  const r = checkFileCap(files(...Array.from({ length: 7 }, (_, i) => `site/src/components/c${i}.astro`)), CFG);
  assert.equal(r.length, 1);
  assert.match(r[0].message, /site\/src\/components/);
  assert.match(r[0].message, /7 files/);
});

test('subdirectories do not count toward their parent cap', () => {
  // Splitting by context is the remedy the rule asks for. If a subfolder counted
  // against its parent, splitting would make the finding worse instead of fixing it.
  const r = checkFileCap(
    files(
      ...Array.from({ length: 6 }, (_, i) => `site/src/components/c${i}.astro`),
      ...Array.from({ length: 6 }, (_, i) => `site/src/components/rail/r${i}.astro`),
    ),
    CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: every over-cap directory is reported, not just the first', () => {
  const r = checkFileCap(
    files(
      ...Array.from({ length: 8 }, (_, i) => `site/src/components/c${i}.astro`),
      ...Array.from({ length: 9 }, (_, i) => `site/lib/content/f${i}.mjs`),
    ),
    CFG,
  );
  assert.deepEqual(r.map((f) => f.dir).sort(), ['site/lib/content', 'site/src/components']);
});

test('the cap is read from config, never hardcoded', () => {
  const four = files(...Array.from({ length: 4 }, (_, i) => `site/src/pages/p${i}.astro`));
  assert.deepEqual(checkFileCap(four, { ...CFG, maxFilesPerDir: 6 }), []);
  assert.equal(checkFileCap(four, { ...CFG, maxFilesPerDir: 3 }).length, 1);
});

// ── S-03 · a package root is calibrated separately ───────────────────────────
//
// The root of a package is not a directory anyone organises: its members are there
// because a tool requires them to be, so splitting it by context is not available as
// a remedy. It is DERIVED from the file list — a directory holding package.json — so
// a package added next month is covered with no edit here (P-13).

test('RED: a package root above the ordinary cap is not a finding', () => {
  const r = checkFileCap(
    files('site/package.json', ...Array.from({ length: 6 }, (_, i) => `site/c${i}.config.mjs`)),
    CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a package root above its OWN cap is a finding', () => {
  const r = checkFileCap(
    files('site/package.json', ...Array.from({ length: 10 }, (_, i) => `site/c${i}.config.mjs`)),
    CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /11 files/);
  assert.match(r[0].message, /package root/);
});

test('RED: the higher calibration does not leak to a directory without package.json', () => {
  const r = checkFileCap(files(...Array.from({ length: 7 }, (_, i) => `site/src/components/c${i}.astro`)), CFG);
  assert.equal(r.length, 1);
});

test('RED: the higher calibration does not leak to a subdirectory of a package root', () => {
  const r = checkFileCap(
    files('site/package.json', ...Array.from({ length: 7 }, (_, i) => `site/src/c${i}.astro`)),
    CFG,
  );
  assert.deepEqual(r.map((f) => f.dir), ['site/src']);
});

test('RED: any directory holding package.json is a package root, not a named one', () => {
  // Derived, never a roster: the repository root and a package nobody has created yet
  // are covered by the same property.
  const r = checkFileCap(
    files(
      'package.json', ...Array.from({ length: 8 }, (_, i) => `c${i}.config.mjs`),
      'tools/reporter/package.json', ...Array.from({ length: 8 }, (_, i) => `tools/reporter/c${i}.mjs`),
    ),
    CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: the package-root cap is read from config, never hardcoded', () => {
  const seven = files('site/package.json', ...Array.from({ length: 6 }, (_, i) => `site/c${i}.mjs`));
  assert.deepEqual(checkFileCap(seven, { ...CFG, maxFilesPerPackageRoot: 10 }), []);
  assert.equal(checkFileCap(seven, { ...CFG, maxFilesPerPackageRoot: 6 }).length, 1);
});

test('RED: a package root with no calibration configured denies rather than passes', () => {
  // G-13. A missing number is a guard that cannot evaluate, and the fail-open reading
  // — treat undefined as no limit — would silently exempt every package root forever.
  const seven = files('site/package.json', ...Array.from({ length: 6 }, (_, i) => `site/c${i}.mjs`));
  assert.throws(() => checkFileCap(seven, { maxFilesPerDir: 6, gateway: CFG.gateway, core: CFG.core }), /maxFilesPerPackageRoot/);
});


// ── S-02 · only the gateway touches the content collection ───────────────────

test('the gateway may import astro:content', () => {
  const r = checkGatewayBoundary([filled('site/src/gateway/pages.ts', "import { getCollection } from 'astro:content';")], CFG);
  assert.deepEqual(r, []);
});

test('RED: a page importing astro:content is a finding', () => {
  const r = checkGatewayBoundary([filled('site/src/pages/index.astro', "import { getCollection } from 'astro:content';")], CFG);
  assert.equal(r.length, 1);
  assert.match(r[0].message, /site\/src\/pages\/index\.astro/);
  assert.match(r[0].message, /astro:content/);
});

test('RED: a component importing astro:content with double quotes is caught too', () => {
  const r = checkGatewayBoundary([filled('site/src/components/Bento.astro', 'import { getEntry } from "astro:content";')], CFG);
  assert.equal(r.length, 1);
});

test('RED: a dynamic import of astro:content is caught', () => {
  const r = checkGatewayBoundary([filled('site/src/layouts/Base.astro', "const c = await import('astro:content');")], CFG);
  assert.equal(r.length, 1);
});

test('a mention inside a line comment is not an import', () => {
  // TASK 10's lesson: a guard that fires on prose is a guard people route around.
  const r = checkGatewayBoundary(
    [filled('site/src/pages/index.astro', "// props come from the gateway, never from 'astro:content'\nconst x = 1;")],
    CFG,
  );
  assert.deepEqual(r, []);
});

test('a mention inside a block comment is not an import', () => {
  const r = checkGatewayBoundary(
    [filled('site/src/pages/index.astro', "/* never import from 'astro:content' here */\nconst x = 1;")],
    CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: commenting out one import does not excuse a real one on another line', () => {
  const r = checkGatewayBoundary(
    [filled('site/src/pages/index.astro', "// from 'astro:content'\nimport { getCollection } from 'astro:content';")],
    CFG,
  );
  assert.equal(r.length, 1);
});

// ── S-01/sub-decision 1 · the core stays framework-free ──────────────────────

test('the core may import plain node modules', () => {
  const r = checkCoreIsFrameworkFree([filled('site/lib/content/parse.mjs', "import { readFileSync } from 'node:fs';")], CFG);
  assert.deepEqual(r, []);
});

test('RED: the core importing anything astro: is a finding', () => {
  const r = checkCoreIsFrameworkFree([filled('site/lib/content/parse.mjs', "import { getCollection } from 'astro:content';")], CFG);
  assert.equal(r.length, 1);
  assert.match(r[0].message, /framework-free/);
});

test('RED: the core reaching into site/src is a finding', () => {
  // The dependency runs one way. A core that imports the Astro tree is no longer
  // runnable by node:test, which is the entire reason it sits outside src/.
  const r = checkCoreIsFrameworkFree([filled('site/lib/i18n/urls.mjs', "import { x } from '../../src/gateway/pages.ts';")], CFG);
  assert.equal(r.length, 1);
  assert.match(r[0].message, /site\/src/);
});

test('src importing from lib is the allowed direction', () => {
  const r = checkCoreIsFrameworkFree([filled('site/src/gateway/pages.ts', "import { join } from '../../lib/content/join.mjs';")], CFG);
  assert.deepEqual(r, []);
});

// ── the composed check ───────────────────────────────────────────────────────

test('checkSite composes all three properties and counts what it scanned', () => {
  const r = checkSite(
    [
      filled('site/src/gateway/pages.ts', "import { getCollection } from 'astro:content';"),
      filled('site/src/pages/index.astro', 'const x = 1;'),
    ],
    CFG,
  );
  assert.deepEqual(r.findings, []);
  assert.equal(r.scanned, 2);
  assert.equal(r.dirs, 2);
});

test('RED: checkSite surfaces a finding from every property, not only the first', () => {
  const over = Array.from({ length: 7 }, (_, i) => filled(`site/src/components/c${i}.astro`, ''));
  const r = checkSite(
    [
      ...over,
      filled('site/src/pages/index.astro', "import { getCollection } from 'astro:content';"),
      filled('site/lib/content/parse.mjs', "import { z } from 'astro:content';"),
    ],
    CFG,
  );
  assert.equal(r.findings.length, 3);
});

test('one violation, one finding: a core file importing astro:content is reported once', () => {
  // It breaks two rules at once. Reporting it twice teaches people to skim the output,
  // and the core's own rule is the stricter and more specific of the two.
  const r = checkSite([{ path: 'site/lib/content/parse.mjs', text: "import { z } from 'astro:content';" }], CFG);
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /framework-free/);
});

test('RED: a bare side-effect import of astro:content is caught', () => {
  // Found by a surviving mutant, not by review: neutering the bare-import branch
  // left all 19 tests green. `import 'astro:content';` is legal and would have
  // walked straight past the boundary (T-03 — a surviving mutant is a finding).
  const r = checkGatewayBoundary([filled('site/src/pages/index.astro', "import 'astro:content';")], CFG);
  assert.equal(r.length, 1);
});

test('RED: a bare side-effect import of Astro in the core is caught', () => {
  const r = checkCoreIsFrameworkFree([filled('site/lib/content/parse.mjs', 'import "astro:content";')], CFG);
  assert.equal(r.length, 1);
});

// ── The gateway is a set of paths, not one prefix ────────────────────────────
// Astro REQUIRES the collection definition to live at src/content.config.ts and to
// import astro:content. It is part of the content-access layer by construction, so
// the boundary is declared as the set of places that layer occupies.

const CFG_SET = { ...CFG, gateway: ['site/src/gateway', 'site/src/content.config.ts'] };

test('RED: the collection config may import astro:content when the boundary names it', () => {
  const r = checkGatewayBoundary(
    [filled('site/src/content.config.ts', "import { defineCollection } from 'astro:content';")],
    CFG_SET,
  );
  assert.deepEqual(r, []);
});

test('a page is still denied when the boundary is a set', () => {
  const r = checkGatewayBoundary(
    [filled('site/src/pages/index.astro', "import { getCollection } from 'astro:content';")],
    CFG_SET,
  );
  assert.equal(r.length, 1);
});

test('a single-string boundary still works, so the config shape stays permissive', () => {
  const r = checkGatewayBoundary([filled('site/src/gateway/pages.ts', "import { getCollection } from 'astro:content';")], CFG);
  assert.deepEqual(r, []);
});

test('RED: a path that merely starts with a named boundary file is not inside it', () => {
  const r = checkGatewayBoundary(
    [filled('site/src/content.config.ts.bak.astro', "import { getCollection } from 'astro:content';")],
    CFG_SET,
  );
  assert.equal(r.length, 1);
});

// ── S-08 · a comment carries no reference to a document outside site/ ────────

const REF = {
  externalDocumentReferences: ['docs/', '.claude/', 'resources/', 'progress/', 'scripts/', 'TASKS.md', 'CLAUDE.md'],
  recordIdPattern: String.raw`\b(?:ADR|INC|EC|EVAL|SPEC)-\d+\b|\bTASK[\s-]\d+\b|\b[HPCTGS]-\d{2}\b`,
};

test('a source file with no comments produces no finding', () => {
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/nav/items.mjs', 'export const items = [];')], REF);
  assert.deepEqual(r, []);
});

test('a comment that explains the code and nothing else is fine', () => {
  const text = '// Resolved before first paint, so the theme never flashes.\nexport const theme = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/behaviour/theme.ts', text)], REF), []);
});

test('RED: a line comment naming an external directory is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/lib/content/pages.mjs', '// See docs/adr/ADR-002-content-pipeline.md\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].file, 'site/lib/content/pages.mjs');
  assert.equal(r[0].line, 1);
});

test('RED: a block comment naming a rule id is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/src/gateway/pages.ts', '/* Only the gateway may import this (S-02). */\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'S-02');
});

test('RED: an HTML comment in an .astro file is scanned too', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/src/pages/index.astro', '<main></main>\n<!-- tracked in TASKS.md -->')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('RED: a work item id in a comment is a finding', () => {
  const r = checkCommentsCarryNoExternalReference(
    [filled('site/lib/i18n/urls.mjs', '// Testimonials arrive with TASK 19.\nexport const x = 1;')],
    REF,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'TASK 19');
});

test('a URL inside a string literal is data, not a comment (TASK 10)', () => {
  // The guard that fires on quoted text is the guard people route around. A path
  // living in a real string is the code doing its job, not a documentation pointer.
  const text = `export const base = '../resources/site';\nexport const url = "https://example.com/docs/x";`;
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/content.config.ts', text)], REF), []);
});

test('a bare URL in a comment does not trip the scanner on its own scheme', () => {
  const text = '// Astro renders this at build: https://astro.build\nexport const x = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/lib/content/x.mjs', text)], REF), []);
});

test("site/'s own tree may be named in a comment", () => {
  const text = '// Mirrors the shape site/lib/content already returns.\nexport const x = 1;';
  assert.deepEqual(checkCommentsCarryNoExternalReference([filled('site/src/gateway/pages.ts', text)], REF), []);
});

test('RED: every offending comment is reported, not only the first', () => {
  const text = '// docs/adr/README.md\nconst a = 1;\n// progress/ has the log\nconst b = 2;';
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/content/x.mjs', text)], REF);
  assert.deepEqual(r.map((f) => f.line), [1, 3]);
});

test('RED: a reference on the third line of a block comment reports that line', () => {
  const text = '/*\n * Fine.\n * Decided in ADR-008.\n */\nexport const x = 1;';
  const r = checkCommentsCarryNoExternalReference([filled('site/lib/nav/items.mjs', text)], REF);
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 3);
});

test('the reference set comes from the caller, never hardcoded', () => {
  const text = '// resources/site holds the copy.\nexport const x = 1;';
  assert.equal(checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], REF).length, 1);
  assert.deepEqual(
    checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], { ...REF, externalDocumentReferences: [] }),
    [],
  );
});

test('checkSite runs the comment check alongside the other three', () => {
  const r = checkSite([filled('site/lib/x.mjs', '// see docs/adr/README.md')], { ...CFG, ...REF });
  assert.equal(r.findings.length, 1);
});

// ── S-08 · the scanner's quote and comment boundaries, as observable outcomes ──

const scan = (text) => checkCommentsCarryNoExternalReference([filled('site/lib/x.mjs', text)], REF);

test('a reference inside a template literal is data, not a comment', () => {
  assert.deepEqual(scan('const url = `https://example.com/docs/y`;'), []);
});

test('an escaped quote does not end the string early, so the real comment after it is still scanned', () => {
  // Without escape handling the string closes at the escaped quote, the rest of the
  // line re-opens one, and the genuine comment is never seen.
  const r = scan("const s = 'it\\'s fine'; // see docs/adr");
  assert.equal(r.length, 1);
  assert.equal(r[0].reference, 'docs/');
});

test('a block comment that closes leaves the rest of the line as code', () => {
  assert.deepEqual(scan('/* fine */ const p = docs/x;'), []);
});

test('an HTML comment that closes leaves the rest of the line as markup', () => {
  assert.deepEqual(scan('<!-- fine --> docs/x'), []);
});

test('a URL scheme is not a comment opener', () => {
  assert.deepEqual(scan('Visit https://example.com/docs/page for more'), []);
});

test('an unterminated quote ends at the newline rather than swallowing the file', () => {
  // An apostrophe in .astro template prose must not blind the scanner for the rest
  // of the file. Recovery at the newline is what bounds the damage to one line.
  const r = scan("const s = 'oops;\n// see docs/adr");
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('a line comment ends at the newline, so the next line is code again', () => {
  assert.deepEqual(scan('// a note\nconst p = docs/x;'), []);
});

test('a block comment spans lines until it closes', () => {
  const r = scan('/* one\n * two docs/x\n */\nconst p = 1;');
  assert.equal(r.length, 1);
  assert.equal(r[0].line, 2);
});

test('the finding names the file, the line and what it matched, and cites the rule', () => {
  const r = scan('// see docs/adr/README.md');
  assert.match(r[0].message, /site\/lib\/x\.mjs:1/);
  assert.match(r[0].message, /S-08/);
  assert.match(r[0].message, /check-docs/);
});

test('a bare // inside a single-quoted string never opens a comment', () => {
  assert.deepEqual(scan("const p = 'a//docs/b';"), []);
});

test('a bare // inside a double-quoted string never opens a comment', () => {
  assert.deepEqual(scan('const p = "a//docs/b";'), []);
});

test('a bare // inside a template literal never opens a comment', () => {
  assert.deepEqual(scan('const p = `a//docs/b`;'), []);
});

// ── CONTENT-006 · a route literal naming a real slug lives only in its declaration site ──
// The slug set is DERIVED from disk by the CLI (P-13) and handed in here as plain data —
// this function reads nothing and knows no slug by name, which is what lets it be tested
// against an invented slug set instead of the real one.

const ROUTE_CFG = { routeDeclarationSites: [], contentSlugs: ['otp-provider-decoupling'], locales: ['en', 'es'] };

test('RED: a route literal naming a real slug in a page is a finding', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/case-study.astro', "const href = '/case-studies/otp-provider-decoupling';")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].file, 'site/src/pages/case-study.astro');
  assert.equal(r[0].line, 1);
  assert.match(r[0].message, /otp-provider-decoupling/);
});

test('RED: the same literal in a test file is a finding too — a test hardcoding the route set is the same defect', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/case-study.test.mjs', "assert.equal(href, '/case-studies/otp-provider-decoupling');")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
});

test('the same literal inside a declared route-declaration site produces no finding', () => {
  const cfg = { ...ROUTE_CFG, routeDeclarationSites: ['site/lib/content/routes'] };
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.mjs', "const path = '/case-studies/otp-provider-decoupling';")],
    cfg,
  );
  assert.deepEqual(r, []);
});

test('a bare slug with no leading slash is not path-shaped and is not a finding', () => {
  // site/src/gateway/content-queries.ts legitimately holds ['home', 'about', 'experience']
  // as the declared page structure — slugs, not routes.
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/gateway/content-queries.ts', "const ROUTED_PAGE_SLUGS = ['otp-provider-decoupling'];")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('a path literal naming a slug the content does not have is a test fixture, not a finding', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.test.mjs', "assert.equal(path, '/case-studies/sample-migration-story');")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('a template literal built from an interpolated slug is the derivation doing its job, not a finding', () => {
  // contentSlugs deliberately includes 'case-studies' — the static prefix — so a
  // check that failed to notice the ${} interpolation and treated the whole thing
  // as a static literal would still find something to flag. Only the exemption
  // stops it, which is what this proves rather than assumes.
  const cfg = { ...ROUTE_CFG, contentSlugs: ['case-studies', 'otp-provider-decoupling'] };
  const r = checkRouteLiteralsAreDerived(
    [filled('site/lib/content/routes/route-set.mjs', 'const path = `/case-studies/${slug}`;')],
    cfg,
  );
  assert.deepEqual(r, []);
});

test('a locale prefix segment on its own is not a slug, even if it were also a content slug', () => {
  // 'es' is structurally a locale prefix in leading position, never a slug reference,
  // regardless of what the derived slug set happens to contain. Proven with 'es' IN
  // contentSlugs so the assertion is meaningful rather than trivially true.
  const cfg = { ...ROUTE_CFG, contentSlugs: ['es', 'otp-provider-decoupling'] };
  const r = checkRouteLiteralsAreDerived([filled('site/src/pages/index.astro', "const p = '/es';")], cfg);
  assert.deepEqual(r, []);
});

test('the locale prefix is stripped before matching, so a prefixed real route still fires', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/index.astro', "const href = '/es/case-studies/otp-provider-decoupling';")],
    ROUTE_CFG,
  );
  assert.equal(r.length, 1);
});

test('a literal inside a comment is prose, not a route (S-08 sibling problem)', () => {
  const r = checkRouteLiteralsAreDerived(
    [filled('site/src/pages/index.astro', "// see '/case-studies/otp-provider-decoupling' for the old shape\nconst x = 1;")],
    ROUTE_CFG,
  );
  assert.deepEqual(r, []);
});

test('checkSite composes the route-literal check alongside the other four', () => {
  const r = checkSite(
    [filled('site/src/pages/index.astro', "const href = '/case-studies/otp-provider-decoupling';")],
    { ...CFG, ...ROUTE_CFG },
  );
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /otp-provider-decoupling/);
});

test('RED: derives from whatever slug set it is given — no roster is hardcoded in the check itself', () => {
  // The check treats contentSlugs as opaque input data. The real derivation reads the
  // filenames under resources/ and runs in the CLI (check-site.mjs); this proves the
  // half that lives here — a sixth case study needs no edit to this file — by growing
  // the slug set between two calls with zero change to checkRouteLiteralsAreDerived.
  const file = filled('site/src/pages/index.astro', "const href = '/case-studies/newly-added-case-study';");
  const beforeItsSlugExisted = checkRouteLiteralsAreDerived([file], { ...ROUTE_CFG, contentSlugs: ['otp-provider-decoupling'] });
  assert.deepEqual(beforeItsSlugExisted, []);

  const afterItsSlugExisted = checkRouteLiteralsAreDerived(
    [file],
    { ...ROUTE_CFG, contentSlugs: ['otp-provider-decoupling', 'newly-added-case-study'] },
  );
  assert.equal(afterItsSlugExisted.length, 1);
  assert.match(afterItsSlugExisted[0].message, /newly-added-case-study/);
});

// ── S-05 · colour and breakpoint literals have one declaration site ──────────
// The token stylesheet is a FILE among the ones handed in, never a name the check
// knows by heart. The sanctioned breakpoint set is DERIVED from it: a custom
// property whose whole value is a bare pixel length (P-13) — which is exactly the
// three --breakpoint-* declarations today and needs no edit for a fourth.

const TOKENS_PATH = 'site/src/styles/tokens.css';
const TOKENS_FIXTURE = [
  ':root {',
  '  --color-bg: #f8f7f4;',
  '  --color-ink-muted: rgba(20, 20, 15, 0.64);',
  '  --color-accent: oklch(42% 0.15 15);',
  '  --breakpoint-medium: 1180px;',
  '  --breakpoint-narrow: 820px;',
  '  --breakpoint-compact: 560px;',
  '  --type-display-l: 500 42px var(--font-display);', // NOT a bare width — shorthand, must not be sanctioned
  '}',
].join('\n');
const TOKEN_CFG = { tokenStylesheet: TOKENS_PATH };
const withTokens = (...extra) => [filled(TOKENS_PATH, TOKENS_FIXTURE), ...extra];

test('RED: a hex colour literal in a component is a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>.card { color: #123456; }</style>')),
    TOKEN_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /#123456/);
  assert.equal(r[0].file, 'site/src/components/Card.astro');
});

test('the same hex colour literal inside the token stylesheet is not a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(withTokens(), TOKEN_CFG);
  assert.deepEqual(r, []);
});

test('a var(--color-*) reference produces no finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>.card { color: var(--color-ink); }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: rgba(), hsl() and oklch() literals outside the token stylesheet are each a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled('site/src/components/A.astro', '<style>.a { color: rgba(0,0,0,.5); }</style>'),
      filled('site/src/components/B.astro', '<style>.b { color: hsl(10 50% 50%); }</style>'),
      filled('site/src/components/C.astro', '<style>.c { color: oklch(50% 0.1 10); }</style>'),
    ),
    TOKEN_CFG,
  );
  assert.equal(r.length, 3);
});

test('a colour-looking hex value inside a comment is prose, not a declaration', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Card.astro', '<style>/* was #123456 before the redesign */ .card { color: var(--color-ink); }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: an SVG fill naming a hex literal is a finding; naming var(--accent) is not', () => {
  const hex = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Icon.astro', '<svg><path fill="#14140F" /></svg>')),
    TOKEN_CFG,
  );
  assert.equal(hex.length, 1);
  const tokenised = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Icon.astro', '<svg><path fill="var(--color-accent)" /></svg>')),
    TOKEN_CFG,
  );
  assert.deepEqual(tokenised, []);
});

test('RED: every offending file is reported, not only the first', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled('site/src/components/A.astro', '<style>.a { color: #111111; }</style>'),
      filled('site/src/components/B.astro', '<style>.b { color: #222222; }</style>'),
    ),
    TOKEN_CFG,
  );
  assert.equal(r.length, 2);
});

// ── the breakpoint half ───────────────────────────────────────────────────────

test('a sanctioned breakpoint inside @media produces no finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 820px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a fourth, unsanctioned breakpoint inside @media is a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 700px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /700px/);
});

test('a max-width CSS PROPERTY outside @media is a content-width cap, not a finding', () => {
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Footer.astro', '<style>.footer__note { max-width: 1032px; }</style>')),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a max-width property inside an @media BODY is still not the condition, and is not a finding', () => {
  // Only the parenthesised condition between @media and the opening { is in scope.
  const r = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(
      filled(
        'site/src/components/Footer.astro',
        '<style>@media (max-width: 820px) { .footer__note { max-width: 400px; } }</style>',
      ),
    ),
    TOKEN_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: the sanctioned set is DERIVED — adding a fourth token clears a width with no config or guard edit', () => {
  const before = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    withTokens(filled('site/src/components/Rail.astro', '<style>@media (max-width: 1440px) { .rail { display: none; } }</style>')),
    TOKEN_CFG,
  );
  assert.equal(before.length, 1);

  const grownTokens = TOKENS_FIXTURE.replace('}', '  --breakpoint-huge: 1440px;\n}');
  const after = checkColourAndBreakpointLiteralsAreDeclaredOnce(
    [
      filled(TOKENS_PATH, grownTokens),
      filled('site/src/components/Rail.astro', '<style>@media (max-width: 1440px) { .rail { display: none; } }</style>'),
    ],
    TOKEN_CFG,
  );
  assert.deepEqual(after, []);
});

test('RED: the token stylesheet missing from the scanned files denies rather than passing quietly', () => {
  assert.throws(
    () => checkColourAndBreakpointLiteralsAreDeclaredOnce([filled('site/src/components/A.astro', '')], TOKEN_CFG),
    /tokens\.css/,
  );
});

test('checkSite composes the token check alongside the others', () => {
  const r = checkSite(
    withTokens(filled('site/src/components/Card.astro', '<style>.card { color: #123456; }</style>')),
    { ...CFG, ...TOKEN_CFG },
  );
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /#123456/);
});

// ── S-01 · every visible string comes from the gateway ───────────────────────
// A .astro file outside the gateway may hand a prop or a gateway value to a text
// node or a human-readable attribute, but it may not DECLARE the string itself —
// as a literal in the markup, or as a local frontmatter constant wearing an
// identifier's name. humanReadableAttributes is config, never a list in the
// check itself (P-13): the last test in this section proves that by changing it.

const STRINGS_CFG = {
  gateway: 'site/src/gateway',
  humanReadableAttributes: ['aria-label', 'alt', 'title', 'placeholder'],
};

test('RED: a literal in a text node is a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/rail/Rail.astro', '---\n---\n<div class="site-rail__role">Senior Software Engineer</div>')],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Senior Software Engineer/);
  assert.equal(r[0].file, 'site/src/components/rail/Rail.astro');
});

test('the same string rendered from an expression is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/Rail.astro',
        '---\nconst { role } = Astro.props;\n---\n<div class="site-rail__role">{role}</div>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a literal in each of the four human-readable attributes is a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled('site/src/components/A.astro', '---\n---\n<button aria-label="Language" />'),
      filled('site/src/components/B.astro', '---\n---\n<img alt="A portrait of the author" />'),
      filled('site/src/components/C.astro', '---\n---\n<span title="Copied to clipboard" />'),
      filled('site/src/components/D.astro', '---\n---\n<input placeholder="Search the site" />'),
    ],
    STRINGS_CFG,
  );
  assert.equal(r.length, 4);
  assert.deepEqual(
    r.map((f) => f.value).sort(),
    ['A portrait of the author', 'Copied to clipboard', 'Language', 'Search the site'].sort(),
  );
});

test('an attribute whose value is an expression is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/LanguageSwitcher.astro',
        '---\nconst { groupLabel } = Astro.props;\n---\n<div role="group" aria-label={groupLabel} />',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('punctuation only, and an HTML entity, are not findings', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled('site/src/components/rail/LanguageSwitcher.astro', '---\n---\n<span aria-hidden="true">/</span>'),
      filled('site/src/components/Footer.astro', '---\n---\n<span>&middot;</span>'),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a literal inside a <style> block is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/Card.astro', "---\n---\n<div />\n<style>.card::before { content: 'Read more'; }</style>")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a literal inside the frontmatter fence, never rendered, is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/Unused.astro', "---\nconst UNUSED_NAME = 'Never Rendered';\n---\n<div />")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('the same literal inside the gateway is not a finding', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/gateway/Debug.astro', '---\n---\n<div class="debug">Senior Software Engineer</div>')],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('a non-.astro file is out of scope entirely, even one full of letters', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/gateway/content-queries.ts', "const GREETING = 'Hello there, this has letters too';")],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a bare identifier bound in frontmatter to a quoted literal is a finding when rendered — the wordmark case', () => {
  // This is the mechanism SHELL-008 exists to catch: a value relocated one line
  // up into a named constant is still a literal, and "it is an expression" alone
  // cannot excuse it. Modelled directly on site/src/components/rail/Rail.astro.
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/Rail.astro',
        "---\nconst SITE_IDENTITY_NAME = 'Luis Antelo';\n---\n" +
          '<div class="site-rail__wordmark"><a href={homeHref}>{SITE_IDENTITY_NAME}</a></div>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Luis Antelo/);
});

test('a computed member expression drawing on a frontmatter object is not a finding — a locale code is data', () => {
  // LOCALE_CODE[lang] is not a bare identifier, so it is left alone even though
  // LOCALE_CODE itself is declared in frontmatter and its values carry letters.
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [
      filled(
        'site/src/components/rail/LanguageSwitcher.astro',
        "---\nconst LOCALE_CODE = { en: 'EN', es: 'ES' };\nconst lang = 'en';\n---\n" +
          '<span>{LOCALE_CODE[lang]}</span>',
      ),
    ],
    STRINGS_CFG,
  );
  assert.deepEqual(r, []);
});

test('RED: a string literal spelled directly inside the braces is a finding too, with one fewer step of indirection', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/A.astro', "---\n---\n<div>{'Senior Software Engineer'}</div>")],
    STRINGS_CFG,
  );
  assert.equal(r.length, 1);
  assert.match(r[0].message, /Senior Software Engineer/);
});

test('the attribute set is derived from config, not hardcoded — an attribute outside it does not fire until config adds it', () => {
  const fixture = [filled('site/src/components/A.astro', '---\n---\n<div data-tooltip="Click to expand" />')];

  const notYetTracked = checkVisibleStringLiteralsComeFromTheGateway(fixture, STRINGS_CFG);
  assert.deepEqual(notYetTracked, []);

  const nowTracked = checkVisibleStringLiteralsComeFromTheGateway(fixture, {
    ...STRINGS_CFG,
    humanReadableAttributes: [...STRINGS_CFG.humanReadableAttributes, 'data-tooltip'],
  });
  assert.equal(nowTracked.length, 1);
  assert.match(nowTracked[0].message, /Click to expand/);
});

test('humanReadableAttributes absent from cfg means the property was not asked for — a quiet pass, not a false one', () => {
  const r = checkVisibleStringLiteralsComeFromTheGateway(
    [filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')],
    { gateway: 'site/src/gateway' },
  );
  assert.deepEqual(r, []);
});

test('RED: gateway missing while humanReadableAttributes is present denies rather than scanning the gateway itself', () => {
  assert.throws(
    () =>
      checkVisibleStringLiteralsComeFromTheGateway(
        [filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')],
        { humanReadableAttributes: STRINGS_CFG.humanReadableAttributes },
      ),
    /gateway/,
  );
});

test('checkSite composes the visible-string check alongside the others', () => {
  const r = checkSite([filled('site/src/components/A.astro', '---\n---\n<div>Senior Software Engineer</div>')], {
    ...CFG,
    ...STRINGS_CFG,
  });
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /Senior Software Engineer/);
});


// ── a config declares, it does not act (TASK 89) ─────────────────────────────
//
// site/astro.config.mjs used to sweep stale cache directories in its MODULE BODY,
// so the sweep ran in every process that loaded the config — `astro check`,
// `astro preview`, `vitest run` through getViteConfig(), and anything inside a
// Stryker sandbox, whose site/node_modules is a symlink to the real one. Proven
// on 2026-08-31: two directories planted in the real site/node_modules were both
// deleted by a plain `vitest run`. A test runner cannot be allowed to garbage-
// collect a build cache, so the config may not reach a mutating fs API at all.

const fsCfg = {
  configFileMarker: '.config.',
  readOnlyFsApis: ['readFileSync', 'readdirSync', 'existsSync', 'statSync'],
};

test('a config importing only read-only fs APIs is clean', () => {
  const files = [{ path: 'site/astro.config.mjs', text: "import { readFileSync, readdirSync } from 'node:fs';" }];
  assert.deepEqual(checkConfigsDeclareRatherThanAct(files, fsCfg), []);
});

test('RED: a config importing rmSync from node:fs is a finding', () => {
  const files = [{ path: 'site/astro.config.mjs', text: "import { readdirSync, readFileSync, rmSync } from 'node:fs';" }];
  const findings = checkConfigsDeclareRatherThanAct(files, fsCfg);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /rmSync/);
});

test('RED: the allowlist is inverted, so an fs API nobody listed is caught by default', () => {
  // The point of naming the READ-ONLY set rather than the mutating one: cpSync did
  // not exist when this was written, and it is caught anyway.
  const files = [{ path: 'site/astro.config.mjs', text: "import { cpSync } from 'node:fs';" }];
  assert.equal(checkConfigsDeclareRatherThanAct(files, fsCfg).length, 1);
});

test('RED: a namespace import is a finding — the guard cannot see what it reaches for (G-13)', () => {
  const files = [{ path: 'site/astro.config.mjs', text: "import * as fs from 'node:fs';" }];
  assert.equal(checkConfigsDeclareRatherThanAct(files, fsCfg).length, 1);
});

test('RED: node:fs/promises and bare fs are the same boundary under a different name', () => {
  const promises = [{ path: 'site/a.config.mjs', text: "import { rm } from 'node:fs/promises';" }];
  const bare = [{ path: 'site/b.config.mjs', text: "import { rmSync } from 'fs';" }];
  assert.equal(checkConfigsDeclareRatherThanAct(promises, fsCfg).length, 1);
  assert.equal(checkConfigsDeclareRatherThanAct(bare, fsCfg).length, 1);
});

test('a file that is not a config may reach for whatever it needs', () => {
  // The rule is about WHEN code runs, not about fs. pipeline-fingerprint.mjs owns
  // the sweep and is called by a build hook, so it is free to import rmSync.
  const files = [{ path: 'site/lib/build/pipeline-fingerprint.mjs', text: "import { rmSync } from 'node:fs';" }];
  assert.deepEqual(checkConfigsDeclareRatherThanAct(files, fsCfg), []);
});

test('RED: an fs import inside a comment is prose, not a reach', () => {
  const files = [{ path: 'site/astro.config.mjs', text: "// import { rmSync } from 'node:fs';\nexport default {};" }];
  assert.deepEqual(checkConfigsDeclareRatherThanAct(files, fsCfg), []);
});

test('RED: an aliased import is reported under its real name, not its alias', () => {
  // `import { rmSync as prune }` is the same reach wearing a different word, and the
  // finding has to name what the file actually imported or nobody can act on it.
  const files = [{ path: 'site/astro.config.mjs', text: "import { readFileSync, rmSync as prune } from 'node:fs';" }];
  const findings = checkConfigsDeclareRatherThanAct(files, fsCfg);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /rmSync/);
  assert.doesNotMatch(findings[0].message, /prune/);
});

test('a read-only API is still read-only when it is aliased', () => {
  const files = [{ path: 'site/astro.config.mjs', text: "import { readFileSync as read } from 'node:fs';" }];
  assert.deepEqual(checkConfigsDeclareRatherThanAct(files, fsCfg), []);
});
