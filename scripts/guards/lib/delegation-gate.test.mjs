import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseYamlish,
  parseRoleTools,
  isWriteCapable,
  extractWorkItems,
  parseWorkItemTypes,
  specVerdict,
  decideDelegation,
  loadEnv,
  checkDelegation,
} from './delegation-gate.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

const CFG = {
  readOnlyTools: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'TodoWrite', 'AskUserQuestion'],
  specRequiredFor: ['feature', 'migration'],
};

/** A minimal env: one role, one work item, no specs. */
function env(over = {}) {
  return {
    config: CFG,
    roleTools: new Map([['researcher', ['Read', 'Grep', 'Glob', 'WebFetch']],
                        ['implementer', ['Read', 'Write', 'Edit', 'Bash']]]),
    workItemTypes: new Map([['TASK-7', 'research'], ['TASK-12', 'feature'], ['TASK-5', 'harness']]),
    specs: [],
    ...over,
  };
}

const APPROVED = { path: 'docs/specs/SPEC-TASK-12-x.spec.md', work_item: 'TASK-12', status: 'active', version: '1.0', approved_version: '1.0' };

// --- parsing ----------------------------------------------------------------

test('parseYamlish reads a fenced yaml block and strips trailing comments', () => {
  const f = parseYamlish('# Title\n\n```yaml\nstatus: draft            # draft = being written\nversion: 1.0\napproved_version:\n```\n');
  assert.equal(f.status, 'draft');
  assert.equal(f.version, '1.0');
  assert.equal(f.approved_version, '');
});

test('parseYamlish reads --- frontmatter too', () => {
  const f = parseYamlish('---\nname: implementer\ntools: Read, Write, Edit\n---\n\nbody\n');
  assert.equal(f.name, 'implementer');
  assert.equal(f.tools, 'Read, Write, Edit');
});

test('parseYamlish does not treat a # inside a quoted value as a comment', () => {
  assert.equal(parseYamlish('---\nintent: "fix the #5 regression"\n---\n').intent, 'fix the #5 regression');
});

test('parseRoleTools accepts both the comma string and the yaml list form', () => {
  assert.deepEqual(parseRoleTools('---\ntools: Read, Grep,  Write\n---\n'), ['Read', 'Grep', 'Write']);
  assert.deepEqual(parseRoleTools('---\ntools:\n  - Read\n  - Bash\n---\n'), ['Read', 'Bash']);
});

test('extractWorkItems finds every spelling and normalizes them', () => {
  assert.deepEqual(extractWorkItems('Implement SPEC-TASK-12 for TASK 12'), ['TASK-12']);
  assert.deepEqual(extractWorkItems('TASK-7 continues the work of TASK 5').sort(), ['TASK-5', 'TASK-7']);
  assert.deepEqual(extractWorkItems('no ids here'), []);
});

test('parseWorkItemTypes reads the register heading shape', () => {
  const md = '## TASK 0 — Case studies · `content` · `DONE`\n\ntext\n\n## TASK 7 — Founding ADRs · `research` · `TODO`\n';
  const m = parseWorkItemTypes(md);
  assert.equal(m.get('TASK-0'), 'content');
  assert.equal(m.get('TASK-7'), 'research');
});

// --- write-capability -------------------------------------------------------

test('a role holding only read-only tools is not write-capable', () => {
  assert.equal(isWriteCapable(['Read', 'Grep', 'WebFetch'], CFG).capable, false);
});

test('a role holding Write, Edit or Bash is write-capable', () => {
  for (const t of ['Write', 'Edit', 'Bash', 'NotebookEdit', 'PowerShell']) {
    assert.equal(isWriteCapable(['Read', t], CFG).capable, true, `${t} should count as write-capable`);
  }
});

test('RED: a tool nobody classified is treated as write-capable, not waved through', () => {
  // P-16: what breaks when the runtime adds a tool next month? The gate gets STRICTER,
  // never blinder. The allowlist is of read-only tools, so an unknown name fails closed.
  const v = isWriteCapable(['Read', 'SomeFutureTool'], CFG);
  assert.equal(v.capable, true);
  assert.match(v.why, /SomeFutureTool/);
});

test('RED: a role with no tools list at all is treated as write-capable', () => {
  assert.equal(isWriteCapable(null, CFG).capable, true);
  assert.equal(isWriteCapable([], CFG).capable, true);
});

test('RED: a wildcard tools list is write-capable', () => {
  assert.equal(isWriteCapable(['*'], CFG).capable, true);
});

// --- the decision -----------------------------------------------------------

test('green path: a read-only role is never gated on a spec', () => {
  const v = decideDelegation({ subagent_type: 'researcher', prompt: 'anything at all' }, env());
  assert.equal(v.allowed, true);
});

test('green path: a write-capable role on a type that produces no spec is allowed', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Do TASK-7' }, env());
  assert.equal(v.allowed, true);
});

test('green path: a write-capable role on an approved, undrifted spec is allowed', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [APPROVED] }));
  assert.equal(v.allowed, true);
});

test('RED: INC-05 first half — delegating while the spec is still draft is denied', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [{ ...APPROVED, status: 'draft', approved_version: '' }] }));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /draft/);
});

test('RED: INC-05 second half — an approved spec that has since drifted is denied', () => {
  // The exact incident: the human approved 1.0, the spec moved to 1.1, three implementers
  // were launched against a version nobody signed off.
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [{ ...APPROVED, version: '1.1' }] }));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /1\.1.*approved_version.*1\.0|drift/i);
});

test('RED: an active spec with an empty approved_version is denied', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [{ ...APPROVED, approved_version: '' }] }));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /never approved|approved_version is empty/i);
});

test('RED: a feature work item with no spec file at all is denied', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' }, env());
  assert.equal(v.allowed, false);
  assert.match(v.reason, /no spec/i);
});

test('RED: a write-capable brief naming no work item is denied', () => {
  // A run with no work item is exactly the ungoverned delegation H-05 exists to stop.
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'just fix the thing' }, env());
  assert.equal(v.allowed, false);
  assert.match(v.reason, /names no work item/i);
});

test('RED: a work item that is not in the register is denied', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Do TASK-99' }, env());
  assert.equal(v.allowed, false);
  assert.match(v.reason, /TASK-99/);
});

test('RED: an undeclared role is treated as write-capable and gated', () => {
  // No role file means no tools list to read. Fail closed: H-05 gates it. Whether an
  // undeclared role may be delegated at all is G-05's business, at rung 2, not this guard's.
  const v = decideDelegation({ subagent_type: 'general-purpose', prompt: 'Implement TASK-12' },
    env({ specs: [{ ...APPROVED, status: 'draft' }] }));
  assert.equal(v.allowed, false);
});

test('RED: every work item named in the brief must pass, not just the first', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'TASK-7 then TASK-12' },
    env({ specs: [{ ...APPROVED, status: 'draft' }] }));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /TASK-12/);
});

test('RED: a superseded spec does not govern a delegation', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [{ ...APPROVED, status: 'superseded' }] }));
  assert.equal(v.allowed, false);
  assert.match(v.reason, /superseded/);
});

test('RED: two specs for one work item — the unapproved one is not ignored', () => {
  const v = decideDelegation({ subagent_type: 'implementer', prompt: 'Implement TASK-12' },
    env({ specs: [APPROVED, { ...APPROVED, path: 'docs/specs/SPEC-TASK-12-b.spec.md', status: 'draft' }] }));
  assert.equal(v.allowed, false);
});

test('specVerdict names the file, so the denial is actionable', () => {
  const v = specVerdict({ ...APPROVED, status: 'draft' });
  assert.match(v.reason, /SPEC-TASK-12-x\.spec\.md/);
});

// --- liveness against the real repository -----------------------------------
// A4: the gate that never fires is INC-08's shape. These assert the parsers still match
// the artifacts they read, so a renamed file or a changed heading fails loudly here.

test('LIVENESS: the real TASKS.md parses into work items with types', () => {
  const m = parseWorkItemTypes(readFileSync(join(ROOT, 'TASKS.md'), 'utf8'));
  assert.ok(m.size >= 9, `expected the register to yield >= 9 work items, got ${m.size}`);
  assert.equal(m.get('TASK-5'), 'harness');
  assert.equal(m.get('TASK-7'), 'research');
});

test('LIVENESS: loadEnv reads the real repository without throwing, and excludes the template', () => {
  const e = loadEnv(ROOT);
  assert.ok(e.workItemTypes.size >= 9);
  assert.ok(Array.isArray(e.specs));
  assert.equal(e.specs.filter((s) => /TEMPLATE/i.test(s.path)).length, 0,
    'SPEC-TEMPLATE.md is a template, not a spec — counting it would deny every delegation forever');
  assert.ok(e.config.specRequiredFor.includes('feature'));
});

test('INC-05 end to end: a fixture repo denies on draft, allows once approved, denies again on drift', () => {
  // The unit tests above cover the decision. This one covers the LOADER: it proves the
  // parsers match the real on-disk shapes — frontmatter, the register heading, the agent
  // file — which is the half a pure test cannot reach. Built as a fixture tree rather
  // than by mutating the repository, so it re-runs and leaves nothing behind.
  const dir = mkdtempSync(join(tmpdir(), 'delegation-gate-'));
  const put = (rel, body) => {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  };
  const spec = (status, version, approved) =>
    put('docs/specs/SPEC-TASK-42-thing.spec.md',
      '# SPEC-TASK-42\n\n```yaml\nspec_id: SPEC-TASK-42\n' +
      `status: ${status}            # draft = being written\nversion: ${version}\n` +
      `approved_version: ${approved}\nwork_item: TASK-42\n\`\`\`\n`);

  try {
    put('scripts/guards/guards.config.json', readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
    put('TASKS.md', '## TASK 42 — Build the thing · `feature` · `TODO`\n');
    put('.claude/agents/implementer.md', '---\nname: implementer\ntools: Read, Write, Edit, Bash\n---\n\nbody\n');
    put('.claude/agents/researcher.md', '---\nname: researcher\ntools: Read, Grep, Glob, WebFetch\n---\n\nbody\n');
    const brief = { subagent_type: 'implementer', prompt: 'Implement behaviors in TASK-42' };

    spec('draft', '1.0', '');
    assert.equal(checkDelegation(dir, brief).allowed, false, 'draft spec must deny');

    spec('active', '1.0', '1.0');
    assert.equal(checkDelegation(dir, brief).allowed, true, 'approved, undrifted spec must allow');

    spec('active', '1.1', '1.0');
    const drifted = checkDelegation(dir, brief);
    assert.equal(drifted.allowed, false, 'a version past approved_version must deny');
    assert.match(drifted.reason, /1\.1/);

    // The read-only role passes the same gate untouched — the guard discriminates on
    // capability, not on who is asking.
    assert.equal(checkDelegation(dir, { ...brief, subagent_type: 'researcher' }).allowed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('LIVENESS: the real spec template would be rejected if it were mistaken for a spec', () => {
  // Belt and braces on the exclusion above: if isTemplate ever stops matching, this shows
  // exactly what the consequence is rather than letting it pass quietly.
  const t = parseYamlish(readFileSync(join(ROOT, 'docs/specs/SPEC-TEMPLATE.md'), 'utf8'));
  assert.equal(t.status, 'draft');
});
