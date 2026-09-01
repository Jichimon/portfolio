import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFileCap } from './file-cap.mjs';

const CFG = { maxFilesPerDir: 6, maxFilesPerPackageRoot: 10 };

const files = (...paths) => paths.map((path) => ({ path, text: '' }));

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
  assert.throws(() => checkFileCap(seven, { maxFilesPerDir: 6 }), /maxFilesPerPackageRoot/);
});
