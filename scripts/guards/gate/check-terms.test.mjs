// The CLI's own red-path battery. lib/terms.test.mjs proves the matching and the masking;
// this proves the WALK — which paths the scan reaches — against a fixture repository.
//
// A fixture, not the real repository, for one reason: proving the scan in red needs a file
// that contains a banned term, and planting a real one would put it in the transcript and in
// the diff (H-04). Fixture terms make the red path re-runnable and leak nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const HERE = import.meta.dirname;
const CLI = join(HERE, 'check-terms.mjs');
const ROOT = join(HERE, '..', '..', '..');

/** A fixture repo: real config, fixture terms, plus whatever files the case needs. */
function fixture(files, { terms = 'FixtureSecret\nSECOND-TERM\n' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'check-terms-'));
  const put = (rel, body) => {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  };
  // The REAL exclusion list, so the fixture cannot drift from what ships.
  put('scripts/guards/guards.config.json', readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
  put('private/banned-terms.txt', terms);
  for (const [rel, body] of Object.entries(files)) put(rel, body);
  return dir;
}

function run(dir) {
  const r = spawnSync(process.execPath, [CLI, '--root', dir], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

const withFixture = (files, opts, fn) => {
  const dir = fixture(files, opts);
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('green path: a clean fixture passes and reports what it covered', () => {
  withFixture({ 'docs/a.md': 'nothing here\n', 'README.md': 'clean\n' }, {}, (dir) => {
    const { status, out } = run(dir);
    assert.equal(status, 0, out);
    assert.match(out, /PASS {2}check-terms/);
    assert.match(out, /2 terms × 3 files scanned/);
  });
});

test('RED: a term in docs/ is caught — the file the shell version never opened', () => {
  withFixture({ 'docs/harness/notes.md': 'we deployed FixtureSecret in March\n' }, {}, (dir) => {
    const { status, out } = run(dir);
    assert.equal(status, 1);
    assert.match(out, /docs\/harness\/notes\.md:1/);
  });
});

test('RED: a term in .claude/ and in scripts/ is caught too', () => {
  withFixture({ '.claude/rules/x.md': 'FixtureSecret\n', 'scripts/y.mjs': '// FixtureSecret\n' }, {}, (dir) => {
    const { status, out } = run(dir);
    assert.equal(status, 1);
    assert.match(out, /\.claude\/rules\/x\.md/);
    assert.match(out, /scripts\/y\.mjs/);
  });
});

test('RED: the failure output never prints the term itself', () => {
  // The guard must not become the leak (H-04). This is the assertion that keeps it honest.
  withFixture({ 'docs/a.md': 'FixtureSecret and SECOND-TERM on one line\n' }, {}, (dir) => {
    const { out } = run(dir);
    assert.ok(!out.includes('FixtureSecret'), out);
    assert.ok(!out.includes('SECOND-TERM'), out);
    assert.match(out, /banned-terms\.txt:1/);
    assert.match(out, /banned-terms\.txt:2/);
  });
});

test('RED: a term inside an excluded path is not reported', () => {
  withFixture({ 'evidence/runs/r1/trace.jsonl': 'FixtureSecret\n', 'docs/ok.md': 'clean\n' }, {}, (dir) => {
    const { status, out } = run(dir);
    assert.equal(status, 0, out);
  });
});

test('RED: a missing term list refuses to pass rather than reporting clean', () => {
  const dir = fixture({ 'docs/a.md': 'clean\n' });
  try {
    rmSync(join(dir, 'private/banned-terms.txt'));
    const { status, out } = run(dir);
    assert.equal(status, 1);
    assert.match(out, /refusing to pass/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('RED: an empty term list fails — it would make every scan pass', () => {
  withFixture({ 'docs/a.md': 'clean\n' }, { terms: '# only comments\n\n' }, (dir) => {
    const { status, out } = run(dir);
    assert.equal(status, 1);
    assert.match(out, /defines no terms/);
  });
});

test('RED: a binary file is skipped rather than crashing the scan', () => {
  const dir = fixture({ 'docs/a.md': 'clean\n' });
  try {
    writeFileSync(join(dir, 'docs/logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]));
    const { status, out } = run(dir);
    assert.equal(status, 0, out);
    assert.match(out, /1 binary skipped/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a fixture run says so, so nobody reads it as a real confidentiality pass', () => {
  withFixture({ 'docs/a.md': 'clean\n' }, {}, (dir) => {
    assert.match(run(dir).out, /FIXTURE ROOT, git checks skipped/);
  });
});

// H-04: private/ is gitignored and never reaches a CI runner, so THIS repository's own term
// list is present only on a machine that holds the confidentiality mapping. Declared as a
// node:test skip rather than an assertion, so the property this test proves — the CLI's real,
// non-fixture behavior — is still checked wherever the mapping actually is, and stated rather
// than silently absent everywhere else (gate.mjs's own 'confidentiality' step carries the same
// skipIf/skipNote pairing for the same reason).
const TERMS = join(ROOT, 'private/banned-terms.txt');
test('LIVENESS: the real repository run is a real run — no fixture banner, git checks on', {
  skip: existsSync(TERMS) ? false : 'private/banned-terms.txt is absent on this machine (H-04) — nothing to run this against',
}, () => {
  const r = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`;
  assert.equal(r.status, 0, out);
  assert.ok(!out.includes('FIXTURE ROOT'), out);
  assert.match(out, /whole repo minus \d+ exclusions/);
});
