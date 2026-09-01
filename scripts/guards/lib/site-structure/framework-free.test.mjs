import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCoreIsFrameworkFree } from './framework-free.mjs';

const CFG = { core: 'site/lib' };

const filled = (path, text) => ({ path, text });

// ── sub-decision 1 · the core stays framework-free ──────────────────────────

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

test('RED: a bare side-effect import of Astro in the core is caught', () => {
  const r = checkCoreIsFrameworkFree([filled('site/lib/content/parse.mjs', 'import "astro:content";')], CFG);
  assert.equal(r.length, 1);
});
