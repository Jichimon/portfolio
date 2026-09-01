import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGatewayBoundary } from './gateway-boundary.mjs';

const CFG = { gateway: 'site/src/gateway', core: 'site/lib' };

const filled = (path, text) => ({ path, text });

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

test('RED: a bare side-effect import of astro:content is caught', () => {
  // Found by a surviving mutant, not by review: neutering the bare-import branch
  // left all 19 tests green. `import 'astro:content';` is legal and would have
  // walked straight past the boundary (T-03 — a surviving mutant is a finding).
  const r = checkGatewayBoundary([filled('site/src/pages/index.astro', "import 'astro:content';")], CFG);
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
