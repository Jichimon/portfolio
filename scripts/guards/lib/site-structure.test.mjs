import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFileCap, checkGatewayBoundary, checkCoreIsFrameworkFree, checkSite } from './site-structure.mjs';

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
