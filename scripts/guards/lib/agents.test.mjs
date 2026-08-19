import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseRole, bootstrapPaths, validateRole, validateRoster } from './agents.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

const POSTURE = ['filesystem_read', 'filesystem_write', 'network', 'credentials', 'approval_required', 'isolation'];

const good = `---
name: implementer
description: Implements an approved spec, test-first.
model: sonnet
tools: Read, Grep, Glob, Edit, Write, Bash
maxTurns: 30
filesystem_read: repository
filesystem_write: the files named in the brief
network: no
credentials: none
approval_required: []
isolation: none
---

Identity paragraph.

## Bootstrap

1. [CLAUDE.md](../../CLAUDE.md)
2. \`docs/harness/contracts.md\`

## Reporting

Report shape.

## Boundaries

- Never commit (\`H-01\`).
`;

const exists = (p) => ['CLAUDE.md', 'docs/harness/contracts.md'].includes(p);

// --- parsing ----------------------------------------------------------------

test('a role file parses into frontmatter and section presence', () => {
  const r = parseRole(good, 'implementer.md');
  assert.equal(r.name, 'implementer');
  assert.equal(r.model, 'sonnet');
  assert.equal(r.maxTurns, '30');
  assert.deepEqual(r.sections.sort(), ['Boundaries', 'Bootstrap', 'Reporting'].sort());
});

test('bootstrap paths are read from both markdown links and backticks', () => {
  assert.deepEqual(bootstrapPaths(good).sort(), ['CLAUDE.md', 'docs/harness/contracts.md']);
});

test('bootstrap paths outside the Bootstrap section are not collected', () => {
  // Boundaries cites `H-01`, which is a rule id, not a path. Collecting it would make the
  // guard demand a file called H-01 and be switched off within a day.
  assert.equal(bootstrapPaths(good).includes('H-01'), false);
});

// --- per-role validation ----------------------------------------------------

test('green path: a complete role file produces no findings', () => {
  assert.deepEqual(validateRole(good, 'implementer.md', exists), []);
});

test('RED: a role with no frontmatter is caught', () => {
  assert.ok(validateRole('# just a document\n', 'x.md', exists).some((f) => /frontmatter/i.test(f.message)));
});

test('RED: an implicit model is caught — inheriting silently runs the expensive one', () => {
  const s = good.replace('model: sonnet\n', '');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /model/.test(f.message)));
});

test('RED: a missing tools allowlist is caught — omitted means inherit everything', () => {
  const s = good.replace('tools: Read, Grep, Glob, Edit, Write, Bash\n', '');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /tools/.test(f.message)));
});

test('RED: a missing maxTurns is caught — it is the only natively enforced budget', () => {
  const s = good.replace('maxTurns: 30\n', '');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /maxTurns/.test(f.message)));
});

test('RED: every one of the six posture dimensions is required, individually', () => {
  // Property-based (P-13): the sixth is checked, not waved through because the first five
  // were there. Written as a loop so adding a seventh dimension needs no new test.
  for (const dim of POSTURE) {
    const s = good.replace(new RegExp(`^${dim}:.*\\n`, 'm'), '');
    assert.ok(validateRole(s, 'implementer.md', exists).some((f) => f.message.includes(dim)),
      `dropping ${dim} was not caught`);
  }
});

test('an empty posture value is not a declaration', () => {
  // `approval_required: []` is a real answer; `network:` with nothing after it is silence,
  // and silence reads as coverage (P-03).
  const s = good.replace('network: no', 'network:');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /network/.test(f.message)));
});

test('RED: each required body section is checked on its own', () => {
  for (const section of ['Bootstrap', 'Reporting', 'Boundaries']) {
    const s = good.replace(`## ${section}`, `## Not${section}`);
    assert.ok(validateRole(s, 'implementer.md', exists).some((f) => f.message.includes(section)),
      `removing ## ${section} was not caught`);
  }
});

test('RED: a bootstrap path that does not resolve is caught — INC-04 bootstrapping into a void', () => {
  const s = good.replace('docs/harness/contracts.md', 'docs/harness/renamed-away.md');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /renamed-away/.test(f.message)));
});

test('RED: a Bootstrap section naming no documents at all is caught', () => {
  const s = good.replace('1. [CLAUDE.md](../../CLAUDE.md)\n2. `docs/harness/contracts.md`\n', 'Read whatever seems relevant.\n');
  assert.ok(validateRole(s, 'implementer.md', exists).some((f) => /names no document/i.test(f.message)));
});

test('RED: a filename that disagrees with the declared name is caught', () => {
  // The delegation gate resolves a role by FILENAME and reads write-capability from the
  // tools inside. If the two disagree, the gate reads one role's tools for another's name.
  assert.ok(validateRole(good, 'test-engineer.md', exists).some((f) => /filename/i.test(f.message)));
});

// --- roster-level rules -----------------------------------------------------

test('RED: a role named orchestrator is refused (G-09)', () => {
  // A subagent cannot ask the human, so it structurally cannot run the checkpoint. Someone
  // reasoning from symmetry would create this file and quietly relocate the checkpoint
  // somewhere it cannot happen.
  assert.ok(validateRoster([{ name: 'orchestrator', file: 'orchestrator.md' }])
    .some((f) => /orchestrator/.test(f.message)));
});

test('RED: two roles claiming the same name are caught', () => {
  assert.ok(validateRoster([{ name: 'researcher', file: 'a.md' }, { name: 'researcher', file: 'b.md' }])
    .some((f) => /duplicate/i.test(f.message)));
});

test('RED: an empty roster fails rather than passing vacuously', () => {
  assert.ok(validateRoster([]).some((f) => /no role/i.test(f.message)));
});

test('green path: a distinct roster passes', () => {
  assert.deepEqual(validateRoster([{ name: 'researcher', file: 'researcher.md' }, { name: 'implementer', file: 'implementer.md' }]), []);
});

// --- liveness against the real roles ----------------------------------------

test('LIVENESS: every real role file validates against the real filesystem', () => {
  const dir = join(ROOT, '.claude/agents');
  assert.ok(existsSync(dir), '.claude/agents does not exist — step 8 has not landed');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 5, `expected at least 5 roles, found ${files.length}`);
  for (const f of files) {
    const found = validateRole(readFileSync(join(dir, f), 'utf8'), f, (p) => existsSync(join(ROOT, p)));
    assert.deepEqual(found, [], `${f}: ${found.map((x) => x.message).join(' | ')}`);
  }
});

test('LIVENESS: the network tools are held by researcher and by nobody else', () => {
  // Axis 4a. Withholding beats guarding: a tool a role does not have cannot be misused,
  // which is stronger than any pattern match over what it might do with it.
  const dir = join(ROOT, '.claude/agents');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const role = parseRole(readFileSync(join(dir, f), 'utf8'), f);
    const net = ['WebFetch', 'WebSearch'].filter((t) => (role.tools ?? '').includes(t));
    if (role.name === 'researcher') assert.deepEqual(net.sort(), ['WebFetch', 'WebSearch']);
    else assert.deepEqual(net, [], `${role.name} holds a network tool`);
  }
});

test('LIVENESS: the roles that must hold no Bash hold none', () => {
  // researcher: network isolation would be meaningless with a shell (axis 4b).
  // harness-evaluator: its value depends on not being able to edit what it scores.
  const dir = join(ROOT, '.claude/agents');
  for (const name of ['researcher', 'harness-evaluator']) {
    const role = parseRole(readFileSync(join(dir, `${name}.md`), 'utf8'), `${name}.md`);
    assert.equal(/\bBash\b|\bPowerShell\b/.test(role.tools ?? ''), false, `${name} holds a shell`);
  }
});

// --- a declaration that the tools contradict -------------------------------

test('RED: declaring no filesystem write while holding a shell is a false declaration', () => {
  // Bash's effective permission is the union of everything it can reach around (Tool
  // Contract §3). `echo x > file` is a write, so `filesystem_write: none` beside a shell
  // claims a posture the role does not have — the false 🔒 the architecture rates worse
  // than an honest 🔧, sitting in the file that is supposed to declare the truth.
  const s2 = good.replace('filesystem_write: the files named in the brief', 'filesystem_write: none');
  assert.ok(validateRole(s2, 'implementer.md', exists)
    .some((f) => /shell/i.test(f.message) && /filesystem_write/.test(f.message)), 
    JSON.stringify(validateRole(s2, 'implementer.md', exists)));
});

test('no filesystem write and no shell is a true declaration', () => {
  const s2 = good
    .replace('tools: Read, Grep, Glob, Edit, Write, Bash', 'tools: Read, Grep, Glob')
    .replace('filesystem_write: the files named in the brief', 'filesystem_write: none');
  assert.deepEqual(validateRole(s2, 'implementer.md', exists), []);
});

test('a scoped write declaration beside a shell is not flagged — it claims nothing false', () => {
  // Only `none` is the overclaim. A role saying "the files in the brief" while holding Bash
  // is describing a procedural scope, which is exactly what A21 says it is.
  assert.deepEqual(validateRole(good, 'implementer.md', exists), []);
});

test('LIVENESS: no real role declares a write posture its tools contradict', () => {
  const dir = join(ROOT, '.claude/agents');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const found = validateRole(readFileSync(join(dir, f), 'utf8'), f, (p) => existsSync(join(ROOT, p)));
    assert.deepEqual(found.filter((x) => /filesystem_write/.test(x.message)), [], f);
  }
});
