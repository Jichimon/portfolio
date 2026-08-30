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
  parseWorkItemStatuses,
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

const REGISTER_HEAD = [
  'Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` · `RETIRED`',
  '',
  '| type | Produces a spec? |',
  '|---|---|',
  '| `content` | No |',
  '| `research` | No |',
  '| `planning` | No |',
  '| `feature` · `migration` | **Yes** |',
  '| `bugfix` · `maintenance` | No |',
  '| `harness` · `documentation` | No |',
  '',
].join('\n');

const withHead = (...headings) => `${REGISTER_HEAD}\n${headings.join('\n\ntext\n\n')}\n`;


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
  // The register head is part of the shape, not decoration: TASK 74 made the type
  // positional against the register's own declared status and type vocabularies.
  const md = `${REGISTER_HEAD}
## TASK 0 — Case studies · \`content\` · \`DONE\`

text

## TASK 7 — Founding ADRs · \`research\` · \`TODO\`
`;
  const m = parseWorkItemTypes(md);
  assert.equal(m.get('TASK-0'), 'content');
  assert.equal(m.get('TASK-7'), 'research');
});

test('parseWorkItemStatuses reads the register heading shape', () => {
  // Mirrors "parseWorkItemTypes reads the register heading shape" — same heading scan,
  // reading the status span instead of the type span (TASK 65).
  const md = `${REGISTER_HEAD}
## TASK 0 — Case studies · \`content\` · \`DONE\`

text

## TASK 7 — Founding ADRs · \`research\` · \`TODO\`
`;
  const m = parseWorkItemStatuses(md);
  assert.equal(m.get('TASK-0'), 'DONE');
  assert.equal(m.get('TASK-7'), 'TODO');
});

test('LIVENESS: the real TASKS.md parses into work items with statuses', () => {
  const m = parseWorkItemStatuses(readFileSync(join(ROOT, 'TASKS.md'), 'utf8'));
  assert.ok(m.size >= 9, `expected the register to yield >= 9 work items, got ${m.size}`);
  assert.equal(m.get('TASK-0'), 'DONE');
  assert.equal(m.get('TASK-5'), 'DONE');
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
    // The register head carries the status and type vocabularies the parser reads (TASK 74),
    // so a fixture register without it is not a register the guard can classify.
    put('TASKS.md', withHead('## TASK 42 — Build the thing · `feature` · `TODO`'));
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

// --- TASK 74: a title word must not displace the type -----------------------
// The old parser took the FIRST backticked all-letter token anywhere in the heading,
// because `.*?` is lazy and the /i flag made [a-z]+ case-insensitive. The type field is
// positional, and reading it by shape rather than by position let a word in the title
// silently answer a rung-1 question.

test('RED (TASK 74): a backticked word in the title does not displace the type', () => {
  const m = parseWorkItemTypes(withHead('## TASK 99 — Fix the `slug` join · `feature` · `TODO`'));
  assert.equal(m.get('TASK-99'), 'feature',
    'a `feature` whose title carries a backticked word must still parse as feature — otherwise specRequiredFor never fires and H-05 fails OPEN');
});

test('RED (TASK 74): the two live misparses in the real register parse correctly', () => {
  const m = parseWorkItemTypes(readFileSync(join(ROOT, 'TASKS.md'), 'utf8'));
  assert.equal(m.get('TASK-53'), 'planning', 'TASK 53 read as "version", from "sits at `version` 1.1"');
  assert.equal(m.get('TASK-62'), 'harness', 'TASK 62 read as "L", from "`L` on the delegated path"');
});

test('RED (TASK 74): a single capital letter in the title is not mistaken for the status', () => {
  // `L` matches /^[A-Z ]+$/, so anchoring on "looks like a status" reintroduces the bug
  // one layer down. The status vocabulary is derived from the register's own header.
  const m = parseWorkItemTypes(withHead('## TASK 98 — `L` on the delegated path · `harness` · `RETIRED`'));
  assert.equal(m.get('TASK-98'), 'harness');
});

test('RED (TASK 74): trailing annotations and parenthetical status text do not break the read', () => {
  // Every shape the real register actually uses, not a sample (P-13).
  const m = parseWorkItemTypes(withHead(
    '## TASK 91 — Astro skeleton · `feature` · `DONE` · **ran fifth**',
    '## TASK 92 — CI deploy pipeline · `feature` · `TODO` (needs TASK 30)',
    '## TASK 93 — Trace redaction · `bugfix` · `DONE` — closed inside `TASK 12`',
    '## TASK 94 — The brief contract · `harness` · `TODO` (needs `TASK 71` · **runs after the site**)',
    '## TASK 95 — Resolve input · `content` · `IN PROGRESS`',
  ));
  assert.equal(m.get('TASK-91'), 'feature');
  assert.equal(m.get('TASK-92'), 'feature');
  assert.equal(m.get('TASK-93'), 'bugfix');
  assert.equal(m.get('TASK-94'), 'harness');
  assert.equal(m.get('TASK-95'), 'content', 'a two-word status must resolve');
});

test('RED (TASK 74): a type outside the declared vocabulary is omitted, not silently accepted', () => {
  // The typo variant of the same fail-open: `bugfixx` is in no specRequiredFor list, so
  // accepting it would clear the item for delegation. An unclassifiable item is absent
  // from the map, and decideDelegation already denies on a missing type.
  const m = parseWorkItemTypes(withHead('## TASK 97 — A typo · `bugfixx` · `TODO`'));
  assert.equal(m.get('TASK-97'), undefined);
});

test('RED (TASK 74): an underivable vocabulary throws rather than returning an empty map', () => {
  // G-13. An empty map would make every item "not in the register" — which denies, so it
  // is safe — but it would deny with a reason that sends the human to the wrong file.
  assert.throws(() => parseWorkItemTypes('## TASK 1 — No header here · `content` · `TODO`\n'),
    /vocabulary/i);
});

test('RED (TASK 74): the fix is load-bearing end to end — a feature with a backticked title still demands its spec', () => {
  const types = parseWorkItemTypes(withHead('## TASK 96 — Fix the `slug` join · `feature` · `TODO`'));
  const v = decideDelegation(
    { subagent_type: 'implementer', prompt: 'Implement TASK 96.' },
    env({ workItemTypes: types, specs: [] }),
  );
  assert.equal(v.allowed, false, 'H-05 must still require an approved spec for a feature');
});

// --- TASK 66: status extraction does not need the type table ----------------
// `registerVocabulary` demanded BOTH a `Status values:` line and a `type` table, and threw
// unless it had both. Reading a status needs neither the table nor a type span: the register's
// first six committed revisions (2026-08-13 -> 2026-08-16) carry `Status values:` and headings
// shaped `## TASK 0 — Case studies · `DONE`` with no type at all, and every one of them threw.
// That blinded the K2 derivation over exactly the era EVAL-000's baseline of 2 came from.
//
// The two vocabularies are now separate: statuses gate the scan, types gate parseWorkItemTypes.
// Both keep their own G-13 throw — a guard that cannot derive what it is asserting has
// asserted nothing.

const STATUS_ONLY_HEAD = 'Status values: `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE`\n';

test('RED (TASK 66): a register with no type table still yields statuses', () => {
  const md = `${STATUS_ONLY_HEAD}
## TASK 0 — Case studies · \`DONE\`

text

## TASK 5 — Website · \`BLOCKED\` (by tasks 1–4)
`;
  const m = parseWorkItemStatuses(md);
  assert.equal(m.get('TASK-0'), 'DONE', 'a heading with no type span must still report its status');
  assert.equal(m.get('TASK-5'), 'BLOCKED', 'a parenthetical after the status must not break the read');
});

test('RED (TASK 66): a title code span before the status does not displace it', () => {
  // The mirror of TASK 74 one column over. `[NEEDS INPUT]` is the real early-register case.
  const m = parseWorkItemStatuses(`${STATUS_ONLY_HEAD}
## TASK 3 — Resolve \`[NEEDS INPUT]\` · \`BLOCKED\` (needs author)
`);
  assert.equal(m.get('TASK-3'), 'BLOCKED');
});

test('RED (TASK 66): a status outside the register\'s declared vocabulary is omitted', () => {
  // The same fail-closed direction TASK 74 chose for types: unclassifiable is absent, never
  // silently accepted, or the derivation invents a transition nobody made.
  const m = parseWorkItemStatuses(`${STATUS_ONLY_HEAD}
## TASK 9 — A typo · \`content\` · \`DONEE\`
`);
  assert.equal(m.get('TASK-9'), undefined);
});

test('RED (TASK 66): parseWorkItemStatuses still throws when no status vocabulary exists (G-13)', () => {
  assert.throws(() => parseWorkItemStatuses('## TASK 1 — No header here · `content` · `TODO`\n'),
    /vocabulary/i);
});

test('RED (TASK 66): parseWorkItemTypes still throws when the type table is missing (G-13)', () => {
  // Loosening the status side must not loosen this one. A missing type table has to keep
  // denying every delegation loudly — H-05 is rung 1 and this is the half that carries it.
  assert.throws(() => parseWorkItemTypes(`${STATUS_ONLY_HEAD}## TASK 1 — Thing · \`content\` · \`TODO\`\n`),
    /vocabulary/i);
});

test('RED (TASK 66): a heading with no type span is absent from parseWorkItemTypes, not defaulted', () => {
  const m = parseWorkItemTypes(withHead('## TASK 0 — Case studies · `DONE`'));
  assert.equal(m.get('TASK-0'), undefined, 'no type span means no type — never the status read as one');
});
