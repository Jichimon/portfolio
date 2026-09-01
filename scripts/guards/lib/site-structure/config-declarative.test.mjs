import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfigsDeclareRatherThanAct } from './config-declarative.mjs';

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
