import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkRoleScope } from './role-scope.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SCOPES = { 'harness-evaluator': ['progress/evaluation-results'] };

test('green path: the scoped role writing inside its scope is allowed', () => {
  assert.equal(checkRoleScope('harness-evaluator', 'Write',
    { file_path: 'progress/evaluation-results/EVAL-000-baseline.md' }, SCOPES).allowed, true);
});

test('RED: the scoped role writing outside its scope is denied', () => {
  const v = checkRoleScope('harness-evaluator', 'Write', { file_path: 'progress/2026-08-18-log.md' }, SCOPES);
  assert.equal(v.allowed, false);
  assert.match(v.reason, /progress\/evaluation-results/);
});

test('RED: the scoped role cannot edit the artifacts it scores', () => {
  // The whole point. Each of these is something an evaluator has an incentive to adjust.
  for (const p of ['scripts/guards/lib/evidence.mjs', 'docs/specs/SPEC-TASK-7.spec.md',
                   '.claude/rules/00-hard-rules.md', 'evaluation-cases/EC-001-metric.yaml', 'TASKS.md']) {
    assert.equal(checkRoleScope('harness-evaluator', 'Edit', { file_path: p }, SCOPES).allowed, false, p);
  }
});

test('RED: a path that climbs out and back in does not escape the scope', () => {
  assert.equal(checkRoleScope('harness-evaluator', 'Write',
    { file_path: 'progress/evaluation-results/../../scripts/gate.mjs' }, SCOPES).allowed, false);
});

test('RED: a sibling directory sharing the prefix is outside the scope', () => {
  // Segment-aware: progress/evaluation-results-old/ is not progress/evaluation-results/.
  assert.equal(checkRoleScope('harness-evaluator', 'Write',
    { file_path: 'progress/evaluation-results-old/x.md' }, SCOPES).allowed, false);
});

test('RED: a scoped role may not reach for a shell', () => {
  // A scope cannot be held through a shell — a script the role writes and then runs defeats
  // any pattern. Refusing the tool is honest; pattern-matching it would be a claimed lock.
  const v = checkRoleScope('harness-evaluator', 'Bash', { command: 'echo hi' }, SCOPES);
  assert.equal(v.allowed, false);
  assert.match(v.reason, /shell/);
});

test('a role with no declared scope is unaffected', () => {
  assert.equal(checkRoleScope('implementer', 'Write', { file_path: 'scripts/x.mjs' }, SCOPES).allowed, true);
  assert.equal(checkRoleScope('implementer', 'Bash', { command: 'node --test' }, SCOPES).allowed, true);
});

test('the orchestrator is not a scoped role', () => {
  // agent_type is absent outside a subagent call, and the main session must stay unaffected.
  assert.equal(checkRoleScope(undefined, 'Write', { file_path: 'anything.md' }, SCOPES).allowed, true);
});

test('reads are never scope-restricted', () => {
  assert.equal(checkRoleScope('harness-evaluator', 'Read', { file_path: 'scripts/gate.mjs' }, SCOPES).allowed, true);
  assert.equal(checkRoleScope('harness-evaluator', 'Grep', { pattern: 'x' }, SCOPES).allowed, true);
});

// --- liveness: the role file's claim must match the enforcement -------------

test('LIVENESS: every scoped role exists, and its file claims the scope the config enforces', () => {
  // The role file says "enforced by a guard, not by instruction". That sentence is a claim
  // about this file, and a claim in prose is still a claim (P-11). If the config ever stops
  // naming the role, the sentence becomes an overclaim and this fails.
  const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
  const scopes = cfg.roleWriteScopes ?? {};
  assert.ok(Object.keys(scopes).length > 0, 'no role write scopes are configured');

  for (const [role, dirs] of Object.entries(scopes)) {
    const file = join(ROOT, '.claude/agents', `${role}.md`);
    assert.ok(existsSync(file), `${role} has a write scope but no role file`);
    const text = readFileSync(file, 'utf8');
    for (const d of dirs) {
      assert.ok(text.includes(d), `${role}.md does not mention its enforced scope ${d}`);
    }
    assert.match(text, /enforced by a guard/i, `${role}.md does not say its scope is enforced`);
  }
});

test('LIVENESS: the configured scope actually denies a write to a sibling of itself', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
  const scopes = cfg.roleWriteScopes ?? {};
  for (const [role, dirs] of Object.entries(scopes)) {
    assert.equal(checkRoleScope(role, 'Write', { file_path: `${dirs[0]}/ok.md` }, scopes).allowed, true);
    assert.equal(checkRoleScope(role, 'Write', { file_path: 'CLAUDE.md' }, scopes).allowed, false);
  }
});

// --- INC-14: the guard that denied everything ---------------------------------------
// Found by the first real delegation, not by a test: harness-evaluator tried to write the
// scorecard it exists to produce, INSIDE its declared scope, and was denied at rung 1.
//
// checkRoleScope prefix-tested a relative scope against whatever string the payload carried,
// and Write always carries an ABSOLUTE path. An absolute path cannot start with
// "progress/evaluation-results", so the only enforced write scope in the harness refused
// 100% of authorized writes. Its battery stayed green because every fixture was relative:
// the red paths were exercised, the green path was never tested against a real payload shape.

const REPO = 'C:/dev/projects/portfolio';
const SC14 = { 'harness-evaluator': ['progress/evaluation-results'] };
const write = (p, root = REPO) => checkRoleScope('harness-evaluator', 'Write', { file_path: p }, SC14, root);

test('RED (INC-14): an ABSOLUTE path inside the scope is allowed', () => {
  const v = write(REPO + '/progress/evaluation-results/EVAL-000-baseline.md');
  assert.equal(v.allowed, true, v.reason);
});

test('RED (INC-14): a backslash absolute path inside the scope is allowed', () => {
  // Assembled from char codes rather than written literally. The first version of this line
  // was authored through a heredoc, which ate the doubled backslashes and left `\d` and `\p`
  // — JS escapes that collapse to plain letters — so the "path" under test was
  // `C:devprojects...` and the test failed against a correct fix. INC-13, fourth occurrence,
  // in a test about path handling.
  const B = String.fromCharCode(92);
  const p = ['C:', 'dev', 'projects', 'portfolio', 'progress', 'evaluation-results', 'EVAL-000.md'].join(B);
  const v = write(p);
  assert.equal(v.allowed, true, v.reason);
});

test('RED (INC-14): the drive letter case does not decide the verdict', () => {
  // The orchestrator run header records cwd with a lowercase drive while the tool payload
  // renders it uppercase, so a case-sensitive prefix test fails on the real pair.
  assert.equal(write('c:/dev/projects/portfolio/progress/evaluation-results/E.md').allowed, true);
  assert.equal(write('C:/dev/projects/portfolio/progress/evaluation-results/E.md', 'c:/dev/projects/portfolio').allowed, true);
});

test('an absolute path OUTSIDE the scope is still denied', () => {
  assert.equal(write(REPO + '/docs/harness/architecture.md').allowed, false);
  assert.equal(write(REPO + '/scripts/gate.mjs').allowed, false);
  assert.equal(write('C:/somewhere/else/x.md').allowed, false);
});

test('an absolute path using .. to leave the scope is judged after resolution', () => {
  assert.equal(write(REPO + '/progress/evaluation-results/../../docs/x.md').allowed, false);
  assert.equal(write(REPO + '/progress/evaluation-results/sub/../EVAL-000.md').allowed, true);
});

test('a relative path still behaves as it always did', () => {
  assert.equal(write('progress/evaluation-results/EVAL-000.md').allowed, true);
  assert.equal(write('docs/harness/architecture.md').allowed, false);
});
