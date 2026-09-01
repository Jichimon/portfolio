// TASK 63's own red-path battery (T-04, P-14). Every assertion above the integration test at
// the bottom is against a synthetic fixture this file builds — never the real STEPS array —
// so this battery proves the validator itself without depending on what other slices of the
// same work item land elsewhere in the tree.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSteps } from './gate-steps.mjs';
import { TIERS } from './gate.mjs';
import { STEPS } from '../../gate.mjs';

/** A fake io: `files` maps a path to its text content. Anything not in the map does not exist. */
const io = (files = {}) => ({
  exists: (p) => Object.prototype.hasOwnProperty.call(files, p),
  read: (p) => files[p],
});

/** A minimal, entirely-valid step. Every RED test starts here and breaks exactly one clause. */
const step = (overrides = {}) => ({
  name: 'sample step',
  protects: 'something worth protecting',
  // Declared, like every real step: TASK 111 made the tier a required property, so a
  // fixture without one is no longer "entirely valid" and every RED test below would
  // start from two findings instead of the one it means to plant.
  tier: 'fast',
  redProof: { file: 'proof.test.mjs', test: 'RED: sample proof' },
  ...overrides,
});

const PROOF_FILE = { 'proof.test.mjs': "test('RED: sample proof', () => { assert.ok(false); });" };

// --- protects ---------------------------------------------------------------------------

test('RED: a step with no protects is a finding', () => {
  const findings = validateSteps([step({ protects: '' })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /protects is missing or empty/.test(f.message)), JSON.stringify(findings));
});

test('a step with protects set is not flagged for it', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /protects/.test(f.message)));
});

// --- redProof shape -----------------------------------------------------------------------

test('RED: a step with no redProof is a finding', () => {
  const findings = validateSteps([step({ redProof: undefined })], io());
  assert.ok(findings.some((f) => /redProof is missing or malformed/.test(f.message)), JSON.stringify(findings));
});

test('RED: a redProof missing its test field is a finding', () => {
  const findings = validateSteps([step({ redProof: { file: 'proof.test.mjs' } })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /redProof is missing or malformed/.test(f.message)), JSON.stringify(findings));
});

test('a step with a well-shaped redProof is not flagged for its shape', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /redProof is missing or malformed/.test(f.message)));
});

// --- redProof.file exists -----------------------------------------------------------------

test('RED: a redProof naming a file that does not exist is a finding', () => {
  const findings = validateSteps([step({ redProof: { file: 'gone.test.mjs', test: 'anything' } })], io());
  assert.ok(findings.some((f) => /redProof file does not exist: gone\.test\.mjs/.test(f.message)), JSON.stringify(findings));
});

test('a redProof naming a file that exists is not flagged for existence', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /does not exist/.test(f.message)));
});

// --- redProof.file contains redProof.test --------------------------------------------------

test('RED: a redProof naming a test the file does not contain is a finding', () => {
  const findings = validateSteps(
    [step({ redProof: { file: 'proof.test.mjs', test: 'a test that was renamed' } })],
    io(PROOF_FILE),
  );
  assert.ok(
    findings.some((f) => f.message === 'proof file proof.test.mjs contains no test named "a test that was renamed" — the demonstration this step claims does not run'),
    JSON.stringify(findings),
  );
});

test('a redProof naming a test the file actually contains is not flagged', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /contains no test named/.test(f.message)));
});

// --- skipIf requires skipNote ---------------------------------------------------------------

test('RED: skipIf with no skipNote is a finding', () => {
  const findings = validateSteps([step({ skipIf: () => false })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /skipIf is declared with no skipNote/.test(f.message)), JSON.stringify(findings));
});

test('skipIf with a skipNote is not flagged for it', () => {
  const findings = validateSteps([step({ skipIf: () => false, skipNote: 'target absent' })], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /skipNote/.test(f.message)));
});

test('a step with no skipIf at all needs no skipNote', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /skipNote/.test(f.message)));
});

// --- cwd exists -----------------------------------------------------------------------------

test('RED: a cwd that does not exist is a finding', () => {
  const findings = validateSteps([step({ cwd: 'site/nope' })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /cwd does not exist: site\/nope/.test(f.message)), JSON.stringify(findings));
});

test('a cwd that exists is not flagged', () => {
  const findings = validateSteps([step({ cwd: 'site' })], io({ ...PROOF_FILE, site: '' }));
  assert.ok(!findings.some((f) => /cwd/.test(f.message)));
});

test('a step with no cwd at all is not flagged', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /cwd/.test(f.message)));
});

// --- cmd entries that look like resolved .mjs paths must exist ------------------------------

test('RED: a cmd entry that looks like a resolved .mjs path but does not exist is a finding', () => {
  const findings = validateSteps(
    [step({ cmd: ['node', 'scripts/guards/gate/missing-checker.mjs'] })],
    io(PROOF_FILE),
  );
  assert.ok(
    findings.some((f) => /cmd names a path that does not exist: scripts\/guards\/gate\/missing-checker\.mjs/.test(f.message)),
    JSON.stringify(findings),
  );
});

test('a cmd entry naming a .mjs path that exists is not flagged', () => {
  const findings = validateSteps(
    [step({ cmd: ['node', 'scripts/guards/gate/present-checker.mjs'] })],
    io({ ...PROOF_FILE, 'scripts/guards/gate/present-checker.mjs': '' }),
  );
  assert.ok(!findings.some((f) => /cmd names a path/.test(f.message)));
});

test('a bare command name with no path separator, like "node", is never checked for existence', () => {
  // 'node'.endsWith('.mjs') is false anyway, but this also covers a bare '*.mjs'-suffixed
  // name with no separator, which is not what a resolved file path looks like.
  const findings = validateSteps([step({ cmd: ['node'] })], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /cmd names a path/.test(f.message)));
});

test('RED: a glob handed to a test runner is not flagged as a missing binary', () => {
  // Found via the real-STEPS integration test below: 'guard tests' and 'site core tests'
  // hand node --test a glob ('scripts/guards/**/*.test.mjs'), which existsSync never resolves
  // regardless of how many real files it matches — the runner expands it, not the filesystem.
  const findings = validateSteps(
    [step({ cmd: ['node', '--test', 'scripts/guards/**/*.test.mjs'] })],
    io(PROOF_FILE),
  );
  assert.ok(!findings.some((f) => /cmd names a path/.test(f.message)), JSON.stringify(findings));
});

// --- a currently-skipped step is reported, but as info, not a hard finding ------------------

test('RED: a step whose skipIf() is true is reported distinguishably from a hard finding', () => {
  const findings = validateSteps(
    [step({ skipIf: () => true, skipNote: 'target absent' })],
    io(PROOF_FILE),
  );
  const skipNotice = findings.find((f) => /presently skipped/.test(f.message));
  assert.ok(skipNotice, JSON.stringify(findings));
  assert.equal(skipNotice.info, true);
  // And nothing else about this otherwise-valid step is reported as a hard finding.
  assert.ok(!findings.some((f) => !f.info));
});

test('a step whose skipIf() is false carries no skip notice', () => {
  const findings = validateSteps([step({ skipIf: () => false, skipNote: 'target absent' })], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /presently skipped/.test(f.message)));
});

// --- a malformed step object is reported, never thrown (G-13) -------------------------------

test('RED: a malformed step object does not throw and is reported as a finding', () => {
  assert.doesNotThrow(() => validateSteps([null, step()], io(PROOF_FILE)));
  const findings = validateSteps([null, step()], io(PROOF_FILE));
  assert.ok(findings.some((f) => f.file === 'step 0' && /is not a step object/.test(f.message)), JSON.stringify(findings));
});

test('a well-formed step array produces no "not a step object" finding', () => {
  const findings = validateSteps([step()], io(PROOF_FILE));
  assert.ok(!findings.some((f) => /is not a step object/.test(f.message)));
});

// --- the integration: the real STEPS array, not a fixture (TASK 63's actual claim) ----------
//
// Everything above proves validateSteps works on synthetic fixtures. This is the one test
// that closes the loop: it imports gate.mjs's REAL, live STEPS array and asserts every one of
// its 20 entries carries a working redProof — which is the property this whole item exists to
// guarantee, checked on the artifact itself rather than on a stand-in for it (P-13). Wired
// here, not in an earlier slice, because it needed every step's actual proof test to exist
// first — the four steps whose proofs are gate.test.mjs's/gate-steps.test.mjs's own mechanism
// tests, and 'design canvas', whose proof is canvas.test.mjs, all landed in parallel slices of
// this same work item.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// gate.mjs's own STEPS mix two path conventions: redProof.file is repo-relative (the same
// convention evaluation-cases/*.yaml already use for proofs), but cwd and cmd entries are
// built with join(ROOT, ...) inside gate.mjs itself and so arrive here already absolute.
// Joining an absolute path onto ROOT a second time silently produces a path that can never
// exist — resolve only the relative ones.
const resolve = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const realIo = { exists: (p) => existsSync(resolve(p)), read: (p) => readFileSync(resolve(p), 'utf8') };

test('the real STEPS array in gate.mjs validates clean — every step has a working redProof, a tier and a well-formed bound', () => {
  const findings = validateSteps(STEPS, realIo).filter((f) => !f.info);
  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2));
});

test('adding a step with no redProof to the real STEPS array is caught, not silently accepted', () => {
  // P-16: what breaks when someone adds a 21st step next month and forgets its proof? This.
  const withExtra = [...STEPS, { name: 'a future step', protects: 'something', cmd: ['node', 'x.mjs'] }];
  const findings = validateSteps(withExtra, realIo).filter((f) => !f.info);
  assert.ok(
    findings.some((f) => f.file === 'a future step' && /redProof is missing or malformed/.test(f.message)),
    JSON.stringify(findings, null, 2),
  );
});

// --- tier (TASK 111) ---------------------------------------------------------------------

test('RED: a step with no tier at all is a finding', () => {
  // The safe default (runs everywhere) is exactly why the declaration is required: in a
  // 22-step array nobody can tell "deliberately in the per-push path" from "nobody
  // thought about it", and only one of those is a decision.
  const findings = validateSteps([step({ tier: undefined })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /no tier declared/.test(f.message)), JSON.stringify(findings));
});

test('RED: a step whose tier is not one of the declared tiers is a finding', () => {
  // Worse than missing: no profile runs it, so the step is deferred in every profile
  // and its DEFER line reads like coverage that happens elsewhere. It happens nowhere.
  const findings = validateSteps([step({ tier: 'nightly' })], io(PROOF_FILE));
  assert.ok(findings.some((f) => /not one of the declared tiers/.test(f.message)), JSON.stringify(findings));
});

test('each declared tier is accepted', () => {
  for (const tier of TIERS) {
    const findings = validateSteps([step({ tier })], io(PROOF_FILE));
    assert.ok(!findings.some((f) => /tier/.test(f.message)), `${tier}: ${JSON.stringify(findings)}`);
  }
});

// --- timeoutMs (TASK 110) ----------------------------------------------------------------

test('RED: a malformed timeoutMs is a finding — spawnSync would ignore it and run unbounded', () => {
  // The failure this closes is silent by construction: the step's declaration says
  // "bounded at 15 minutes", spawnSync drops a non-numeric timeout on the floor, and the
  // step runs forever while the array claims otherwise.
  for (const bad of ['900000', 0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
    const findings = validateSteps([step({ timeoutMs: bad })], io(PROOF_FILE));
    assert.ok(
      findings.some((f) => /timeoutMs must be a positive, finite number/.test(f.message)),
      `${JSON.stringify(bad)} was accepted: ${JSON.stringify(findings)}`,
    );
  }
});

test('a positive finite timeoutMs is accepted, and no bound at all is legitimate', () => {
  assert.ok(!validateSteps([step({ timeoutMs: 900_000 })], io(PROOF_FILE)).some((f) => /timeoutMs/.test(f.message)));
  assert.ok(!validateSteps([step()], io(PROOF_FILE)).some((f) => /timeoutMs/.test(f.message)));
});

// --- cross-tier dependencies (TASK 111) --------------------------------------------------

test('RED: a fast step depending on a deep step is a finding — it would be BLOCKED in every fast run', () => {
  const steps = [
    step({ name: 'heavy', tier: 'deep' }),
    step({ name: 'light', tier: 'fast', dependsOn: 'heavy' }),
  ];
  const findings = validateSteps(steps, io(PROOF_FILE));
  assert.ok(findings.some((f) => /do not run/.test(f.message)), JSON.stringify(findings));
});

test('a deep step depending on a fast step is fine — the fast one runs in every profile the deep one does', () => {
  const steps = [
    step({ name: 'light', tier: 'fast' }),
    step({ name: 'heavy', tier: 'deep', dependsOn: 'light' }),
  ];
  assert.ok(!validateSteps(steps, io(PROOF_FILE)).some((f) => /do not run/.test(f.message)));
});

test('a dependency naming a step that is not in the array is left to the resolve check', () => {
  // runGate throws on it (G-13). Reporting it here too would name one defect twice and
  // teach the reader that the two checks disagree about whose problem it is.
  const steps = [step({ name: 'light', tier: 'fast', dependsOn: 'nowhere' })];
  assert.ok(!validateSteps(steps, io(PROOF_FILE)).some((f) => /do not run/.test(f.message)));
});

test('LIVENESS: the real gate has no cross-tier dependency, checked rather than assumed', () => {
  // The mutation step depends on both test tiers and is itself `deep`; that direction is
  // the safe one and this asserts it stayed that way after the split.
  const findings = validateSteps(STEPS, realIo).filter((f) => /do not run/.test(f.message));
  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2));
});
