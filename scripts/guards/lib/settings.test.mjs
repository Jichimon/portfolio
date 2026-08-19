import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSettings } from './settings.mjs';

const B = { write: ['resources', 'evidence', '.git'], read: ['private'] };

const good = {
  permissions: {
    deny: [
      'Write(./resources/**)', 'Edit(./resources/**)',
      'Write(./evidence/**)', 'Edit(./evidence/**)',
      'Write(./.git/**)', 'Edit(./.git/**)',
      'Read(./private/**)',
    ],
    ask: ['Bash(rm -rf:*)'],
    disableBypassPermissionsMode: 'disable',
  },
  hooks: {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node scripts/guards/hooks/pretooluse.mjs' }] }],
  },
  disableAllHooks: false,
};

const OPTS = { hookPath: 'scripts/guards/hooks/pretooluse.mjs', hookExists: true };

test('green path: settings that carry every boundary pass', () => {
  assert.deepEqual(validateSettings(good, B, OPTS), []);
});

// --- red paths --------------------------------------------------------------

test('RED: a write boundary with no Write() deny is caught', () => {
  // The exact false-🔒 this exists for: H-02 reads as rung 1, but the file tools are open.
  const s = structuredClone(good);
  s.permissions.deny = s.permissions.deny.filter((p) => p !== 'Write(./resources/**)');
  const found = validateSettings(s, B, OPTS);
  assert.ok(found.some((x) => x.boundary === 'resources' && /missing a Write\(\) deny/.test(x.message)));
});

test('RED: a write boundary with no Edit() deny is caught', () => {
  const s = structuredClone(good);
  s.permissions.deny = s.permissions.deny.filter((p) => p !== 'Edit(./evidence/**)');
  assert.ok(validateSettings(s, B, OPTS).some((x) => /missing a Edit\(\) deny/.test(x.message)));
});

test('RED: a read boundary with no Read() deny is caught', () => {
  const s = structuredClone(good);
  s.permissions.deny = s.permissions.deny.filter((p) => p !== 'Read(./private/**)');
  assert.ok(validateSettings(s, B, OPTS).some((x) => /read boundary "private"/.test(x.message)));
});

test('RED: a boundary resting on an ask rule is caught', () => {
  // G-03: ask is removed by bypassPermissions. A boundary there is not a boundary.
  const s = structuredClone(good);
  s.permissions.ask.push('Write(./resources/**)');
  assert.ok(validateSettings(s, B, OPTS).some((x) => /ask is hardening, not a boundary/.test(x.message)));
});

test('RED: no deny rules at all is caught', () => {
  assert.ok(validateSettings({ permissions: { deny: [] }, hooks: good.hooks }, B, OPTS)
    .some((x) => /survives bypassPermissions/.test(x.message)));
});

test('RED: no PreToolUse hook leaves the shell vector uncovered', () => {
  const s = structuredClone(good);
  s.hooks = {};
  assert.ok(validateSettings(s, B, OPTS).some((x) => /shell vector has no coverage/.test(x.message)));
});

test('RED: wiring that points at a hook which does not exist is caught', () => {
  // A hook path that resolves to nothing fails silently at runtime — INC-08's shape.
  assert.ok(validateSettings(good, B, { ...OPTS, hookExists: false })
    .some((x) => /does not exist on disk/.test(x.message)));
});

test('RED: wiring that invokes some other script is caught', () => {
  const s = structuredClone(good);
  s.hooks.PreToolUse[0].hooks[0].command = 'node scripts/something-else.mjs';
  assert.ok(validateSettings(s, B, OPTS).some((x) => /does not invoke/.test(x.message)));
});

test('RED: settings that do not pin disableAllHooks are caught', () => {
  // Verified against the docs: "Claude Code reads the value left after settings precedence
  // applies, so a `disableAllHooks: false` in a project's .claude/settings.json overrides a
  // `true` in your user settings." Leaving the key absent means a single line in a user
  // settings file silently disables every guard in this harness, with nothing to see.
  const s = structuredClone(good);
  delete s.disableAllHooks;
  assert.ok(validateSettings(s, B, OPTS).some((x) => /disableAllHooks/.test(x.message)));
});

test('RED: settings that disable all hooks are caught', () => {
  assert.ok(validateSettings({ ...good, disableAllHooks: true }, B, OPTS)
    .some((x) => /disableAllHooks/.test(x.message)));
});

test('RED: a PreToolUse matcher that omits Agent leaves the delegation gate dead', () => {
  // A4, INC-08's shape. The gate was originally specified on matcher `Task` — a tool that
  // does not exist — which would have gated nothing while everything looked green. The
  // matcher is asserted against the tools the guards actually dispatch on.
  const s = structuredClone(good);
  s.hooks.PreToolUse[0].matcher = 'Bash|Write|Edit';
  const found = validateSettings(s, B, { ...OPTS, requiredMatchers: ['Bash', 'Write', 'Agent'] });
  assert.ok(found.some((x) => /Agent/.test(x.message)), JSON.stringify(found));
});

test('a matcher naming every required tool passes', () => {
  const s = structuredClone(good);
  s.hooks.PreToolUse[0].matcher = 'Bash|PowerShell|Write|Edit|NotebookEdit|Read|Grep|Glob|Agent';
  assert.deepEqual(validateSettings(s, B, { ...OPTS, requiredMatchers: ['Bash', 'Write', 'Agent'] }), []);
});

test('RED: not disabling bypassPermissions mode is caught', () => {
  // G-04 was written believing this needed machine-level managed settings. It does not —
  // the setting works from any scope. Once a rule becomes enforceable, the claim has to be
  // made honest and then held there (G-11); this check is what holds it.
  const s = structuredClone(good);
  delete s.permissions.disableBypassPermissionsMode;
  assert.ok(validateSettings(s, B, OPTS).some((x) => /disableBypassPermissionsMode/.test(x.message)));
});

test('adding a boundary to config without adding its deny rules fails', () => {
  // Property-based: a sixth boundary is checked, not waved through (P-13).
  const B6 = { write: [...B.write, 'secrets'], read: B.read };
  assert.ok(validateSettings(good, B6, OPTS).some((x) => x.boundary === 'secrets'));
});

test('a `*` matcher covers every required tool without listing them', () => {
  // And it is what this project uses: a matcher listing only the dispatched tools leaves
  // every other tool unrecorded, producing tool.result events with no tool.requested.
  const s2 = structuredClone(good);
  s2.hooks.PreToolUse[0].matcher = '*';
  assert.deepEqual(validateSettings(s2, B, { ...OPTS, requiredMatchers: ['Bash', 'Write', 'Agent'] }), []);
});
