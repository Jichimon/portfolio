import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFileCap, checkGatewayBoundary, checkCoreIsFrameworkFree, checkCommentsCarryNoExternalReference, checkSite } from './site-structure.mjs';

const CFG = { maxFilesPerDir: 6, gateway: 'site/src/gateway', core: 'site/lib' };

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
