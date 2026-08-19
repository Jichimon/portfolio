import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', '..');
import {
  runIdFor,
  redactToolInput,
  classifyError,
  buildEvent,
  nextSeq,
  validateTrace,
  validateWiring,
  validateVocabulary,
  SCHEMA,
  eventsFor,
  rejectReason,
} from './evidence.mjs';

const TERMS = [{ term: 'AcmeCore', line: 1 }];

// --- run identity -----------------------------------------------------------

test('the orchestrator run is the session; a delegated run hangs off it', () => {
  assert.deepEqual(runIdFor({ session_id: 's1' }), { run_id: 's1', parent_run_id: null, agent: 'orchestrator' });
  assert.deepEqual(runIdFor({ session_id: 's1', agent_id: 'a9', agent_type: 'implementer' }),
    { run_id: 's1:a9', parent_run_id: 's1', agent: 'implementer' });
});

test('a subagent with no declared type still gets a run id', () => {
  assert.equal(runIdFor({ session_id: 's1', agent_id: 'a9' }).run_id, 's1:a9');
});

// --- redaction: the property that makes the trace safe to keep --------------

test('a file write records path, size and hash — never the contents', () => {
  const t = redactToolInput('Write', { file_path: 'docs/a.md', content: 'secret contents here' }, TERMS);
  assert.equal(t.file_path, 'docs/a.md');
  assert.equal(t.bytes, 20);
  assert.match(t.sha256, /^[0-9a-f]{16}$/);
  assert.equal(JSON.stringify(t).includes('secret contents here'), false);
});

test('RED: an Edit records both strings by size and hash, never by value', () => {
  const t = redactToolInput('Edit', { file_path: 'a.md', old_string: 'aaa', new_string: 'bbbb' }, TERMS);
  const s = JSON.stringify(t);
  assert.ok(!s.includes('aaa') && !s.includes('bbbb'), s);
  assert.equal(t.bytes, 4);
});

test('RED: a command string is scrubbed against the banned terms before it is written', () => {
  const t = redactToolInput('Bash', { command: 'grep AcmeCore docs/' }, TERMS);
  assert.ok(!t.command.includes('AcmeCore'), t.command);
  assert.match(t.command, /█{8}/);
});

test('RED: a banned term in a FILE PATH is scrubbed too', () => {
  // The obvious half is scrubbing commands. A path is just as publishable, and a repository
  // full of internal system names would leak through the field nobody thought about.
  const t = redactToolInput('Read', { file_path: 'docs/AcmeCore-notes.md' }, TERMS);
  assert.ok(!t.file_path.includes('AcmeCore'), t.file_path);
});

test('RED: a delegation records the brief by size and hash, never its text', () => {
  const t = redactToolInput('Agent', { subagent_type: 'implementer', prompt: 'do the thing with AcmeCore' }, TERMS);
  assert.equal(t.subagent_type, 'implementer');
  assert.ok(!JSON.stringify(t).includes('AcmeCore'));
  assert.ok(t.bytes > 0);
});

test('RED: a tool nobody wrote a redactor for records only its keys, never its values', () => {
  // Fail closed (P-16): a tool added next month is unknown here, and the default must be to
  // record nothing that could carry content. The alternative — pass the input through —
  // makes the trace leak the first time the runtime ships a tool.
  const t = redactToolInput('SomeFutureTool', { secretPayload: 'AcmeCore internals', n: 5 }, TERMS);
  assert.deepEqual(t, { keys: ['secretPayload', 'n'] });
});

test('a tool result is never stored — only whether it worked and how big it was', () => {
  const ev = buildEvent('tool.result', { seq: 3, tool_use_id: 't1' },
    { ok: true, bytes: 400, duration_ms: 12 });
  assert.equal(JSON.stringify(ev).includes('output'), false);
  assert.equal(ev.ok, true);
});

// --- error classification ---------------------------------------------------

test('an error becomes a class, not a message', () => {
  assert.equal(classifyError('ENOENT: no such file or directory, open /x/AcmeCore.md'), 'not_found');
  assert.equal(classifyError('EACCES: permission denied'), 'permission_denied');
  assert.equal(classifyError('Command timed out after 120000ms'), 'timeout');
  assert.equal(classifyError('Command failed with exit code 1'), 'nonzero_exit');
  assert.equal(classifyError('something nobody anticipated'), 'unknown');
});

test('RED: the classifier never returns any part of the message', () => {
  for (const msg of ['ENOENT: /secret/AcmeCore.md', 'weird AcmeCore failure']) {
    assert.ok(!classifyError(msg).includes('AcmeCore'));
  }
});

// --- seq --------------------------------------------------------------------

test('seq starts at 1 and continues from the highest already written', () => {
  assert.equal(nextSeq(''), 1);
  assert.equal(nextSeq('{"seq":1}\n{"seq":2}\n'), 3);
});

test('RED: a truncated final line does not reset the counter', () => {
  // A crashed hook can leave a partial line. Restarting seq at 1 would make the gap
  // invisible, which is the one property the counter exists to provide.
  assert.equal(nextSeq('{"seq":1}\n{"seq":2}\n{"seq":3'), 4);
});

// --- validateTrace: the gate's check ----------------------------------------

const ok = [
  { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
  { ev: 'tool.requested', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: { command: 'ls' } },
  { ev: 'policy.decision', seq: 3, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool_use_id: 't1', decision: 'allow', source: 'guard' },
  { ev: 'tool.result', seq: 4, ts: '2026-08-18T10:00:02Z', run_id: 's1', tool_use_id: 't1', ok: true },
];

const lines = (evs) => evs.map((e) => JSON.stringify(e)).join('\n') + '\n';

test('green path: a well-formed trace validates', () => {
  assert.deepEqual(validateTrace(lines(ok), TERMS), []);
});

test('RED: a gap in seq is reported — that is the whole point of the counter', () => {
  const bad = structuredClone(ok);
  bad[2].seq = 9;
  assert.match(validateTrace(lines(bad), TERMS)[0].message, /seq/);
});

test('RED: a duplicate seq is reported as well as a gap', () => {
  const bad = structuredClone(ok);
  bad[2].seq = 2;
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /seq/.test(f.message)));
});

test('RED: an unknown event type is reported rather than ignored', () => {
  const bad = [...structuredClone(ok), { ev: 'something.else', seq: 5, ts: '2026-08-18T10:00:03Z', run_id: 's1' }];
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /something\.else/.test(f.message)));
});

test('RED: a missing required field is reported, per event type', () => {
  const bad = structuredClone(ok);
  delete bad[1].tool_use_id;
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /tool_use_id/.test(f.message)));
});

test('RED: a banned term anywhere in the trace is reported, and not echoed', () => {
  const bad = structuredClone(ok);
  bad[1].target = { command: 'cat AcmeCore.md' };
  const found = validateTrace(lines(bad), TERMS);
  assert.ok(found.some((f) => /redaction/i.test(f.message)), JSON.stringify(found));
  assert.ok(!JSON.stringify(found).includes('AcmeCore'));
});

test('RED: a result with no matching request is reported', () => {
  const bad = structuredClone(ok);
  bad[3].tool_use_id = 'orphan';
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /orphan|no matching/i.test(f.message)));
});

test('RED: malformed JSON is a finding, not a crash', () => {
  assert.ok(validateTrace('{"ev":"run.header","seq":1}\nnot json at all\n', TERMS)
    .some((f) => /parse/i.test(f.message)));
});

test('an empty trace file is a finding — a run that recorded nothing recorded nothing', () => {
  assert.ok(validateTrace('', TERMS).some((f) => /empty/i.test(f.message)));
});

// --- the derivation the whole schema exists for -----------------------------

test('a denied call has a request and a decision but NO result — that is an attempt', () => {
  const attempt = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
    { ev: 'tool.requested', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: { command: 'git commit' } },
    { ev: 'policy.decision', seq: 3, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool_use_id: 't1', decision: 'deny', source: 'guard', rule: 'H-01', guard: 'git-write' },
  ];
  // The missing tool.result is CORRECT here, and the validator must not call it an error.
  // "The agent tried something dangerous" and "something dangerous happened" are opposite
  // outcomes, and a validator that demanded a result for every request would erase the
  // distinction the trace exists to make.
  assert.deepEqual(validateTrace(lines(attempt), TERMS), []);
});

test('RED: a deny decision missing its rule or guard is reported', () => {
  const bad = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
    { ev: 'tool.requested', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} },
    { ev: 'policy.decision', seq: 3, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool_use_id: 't1', decision: 'deny', source: 'guard' },
  ];
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /rule|guard/.test(f.message)));
});

// --- wiring: the half that a trace-reading check can never see --------------

const EVENTS = ['PostToolUse', 'SessionStart'];
const HOOK = 'scripts/guards/hooks/record-event.mjs';
const wired = {
  hooks: {
    PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `node ${HOOK}` }] }],
    SessionStart: [{ matcher: '*', hooks: [{ type: 'command', command: `node ${HOOK}` }] }],
  },
};

test('green path: every recorded event is registered against the writer', () => {
  assert.deepEqual(validateWiring(wired, EVENTS, HOOK), []);
});

test('RED: an unregistered event is caught — it would record nothing, silently', () => {
  const s = structuredClone(wired);
  delete s.hooks.SessionStart;
  assert.ok(validateWiring(s, EVENTS, HOOK).some((f) => /SessionStart/.test(f.message)));
});

test('RED: an event registered to some other script is caught', () => {
  const s = structuredClone(wired);
  s.hooks.PostToolUse[0].hooks[0].command = 'node scripts/other.mjs';
  assert.ok(validateWiring(s, EVENTS, HOOK).some((f) => /does not invoke/.test(f.message)));
});

test('RED: a filtered matcher is caught — a partial trace that reads as complete', () => {
  // The failure mode is not a crash. It is a trace that looks fine and is missing the calls
  // nobody thought to include in the filter.
  const s = structuredClone(wired);
  s.hooks.PostToolUse[0].matcher = 'Write|Edit';
  assert.ok(validateWiring(s, EVENTS, HOOK).some((f) => /matcher/.test(f.message)));
});

test('an omitted matcher means match-all and is accepted', () => {
  const s = structuredClone(wired);
  delete s.hooks.PostToolUse[0].matcher;
  assert.deepEqual(validateWiring(s, EVENTS, HOOK), []);
});

test('green path: the declared vocabulary matches the schema', () => {
  assert.deepEqual(validateVocabulary(Object.keys(SCHEMA)), []);
});

test('RED: an event the writer can emit but config never declared is caught', () => {
  assert.ok(validateVocabulary(Object.keys(SCHEMA).filter((e) => e !== 'run.footer'))
    .some((f) => /run\.footer/.test(f.message)));
});

test('RED: a declared event with no schema is caught — nothing would validate it', () => {
  assert.ok(validateVocabulary([...Object.keys(SCHEMA), 'ghost.event'])
    .some((f) => /ghost\.event/.test(f.message)));
});

// --- the runtime coupling ---------------------------------------------------
// These payload shapes were CAPTURED FROM THE RUNNING TOOL, not transcribed from the docs.
// The docs summarize PostToolUse's output field as `tool_result`; the runtime sends
// `tool_response`. The first version of the writer read the documented name and recorded
// every result as zero bytes, healthily and forever — INC-08 inside the subsystem built to
// prevent it. These tests are what make that a one-time mistake.

const POST_TOOL_USE_KEYS = ['session_id', 'transcript_path', 'cwd', 'prompt_id', 'permission_mode',
  'effort', 'hook_event_name', 'tool_name', 'tool_input', 'tool_response', 'tool_use_id', 'duration_ms'];
const POST_TOOL_USE_FAILURE_KEYS = ['session_id', 'transcript_path', 'cwd', 'prompt_id', 'permission_mode',
  'effort', 'hook_event_name', 'tool_name', 'tool_input', 'tool_use_id', 'error', 'is_interrupt', 'duration_ms'];

test('RED: a tool result is measured from `tool_response`, the field the runtime sends', () => {
  const [ev] = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash',
    tool_response: 'twelve bytes', duration_ms: 42 }, TERMS);
  assert.equal(ev.ok, true);
  assert.equal(ev.bytes, 12, 'zero here means the field name drifted and every result is being recorded empty');
  assert.equal(ev.duration_ms, 42);
});

test('the captured payload shape still contains every field the writer reads', () => {
  // If the runtime renames one of these, this fails with the name in the message rather than
  // the writer silently recording nulls.
  for (const f of ['tool_response', 'tool_use_id', 'tool_name', 'duration_ms']) {
    assert.ok(POST_TOOL_USE_KEYS.includes(f), `PostToolUse no longer carries ${f}`);
  }
  for (const f of ['error', 'is_interrupt', 'duration_ms']) {
    assert.ok(POST_TOOL_USE_FAILURE_KEYS.includes(f), `PostToolUseFailure no longer carries ${f}`);
  }
});

test('RED: an interrupted call is not recorded as a tool failure', () => {
  // Conflating them corrupts every metric built on error rates: the user changing their mind
  // is not the tool failing, and only `is_interrupt` distinguishes the two.
  const [ev] = eventsFor({ hook_event_name: 'PostToolUseFailure', tool_use_id: 't1',
    error: 'Command failed with exit code 1', is_interrupt: true }, TERMS);
  assert.equal(ev.error_class, 'interrupted');
});

test('a real failure keeps its class', () => {
  const [ev] = eventsFor({ hook_event_name: 'PostToolUseFailure', tool_use_id: 't1',
    error: 'EACCES: permission denied', is_interrupt: false }, TERMS);
  assert.equal(ev.error_class, 'permission_denied');
});

test('a run header carries the posture the trace was recorded under', () => {
  const [ev] = eventsFor({ hook_event_name: 'SessionStart', permission_mode: 'bypassPermissions' },
    TERMS, { enforcementEnvironment: 'policy-controlled' });
  assert.equal(ev.permission_mode, 'bypassPermissions');
  assert.equal(ev.enforcement_environment, 'policy-controlled');
});

test('every wired hook event produces at least one event, and unknown ones produce none', () => {
  // Property-based (P-13): derived from the config the settings file is validated against,
  // so wiring an event nobody handles fails here instead of recording nothing forever.
  const declared = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'))
    .evidence.recordedHookEvents;
  for (const ev of declared) {
    assert.ok(eventsFor({ hook_event_name: ev, tool_use_id: 't1' }, TERMS).length >= 1,
      `${ev} is wired in settings.json but eventsFor produces nothing for it`);
  }
  assert.deepEqual(eventsFor({ hook_event_name: 'Notification' }, TERMS), []);
});

// --- write-time rejection ---------------------------------------------------
// The trace is append-only and H-03 denies every agent vector into it, so a malformed event
// is PERMANENT: it fails the gate forever and only the human can clean it up. Found the hard
// way — synthetic probe payloads without `tool_use_id` reddened the gate and could not be
// removed by the party that wrote them.

test('a conforming event is not rejected', () => {
  assert.equal(rejectReason({ ev: 'tool.requested', tool: 'Bash', tool_use_id: 't1', target: {} }), null);
});

test('RED: an event missing a required field is rejected before it reaches disk', () => {
  const why = rejectReason({ ev: 'tool.requested', tool: 'Bash', target: {} });
  assert.match(why, /tool_use_id/);
});

test('RED: an event outside the schema is rejected', () => {
  assert.match(rejectReason({ ev: 'made.up' }), /unknown event type/);
});

test('run_id is exempt, because the writer stamps it after this check', () => {
  assert.equal(rejectReason({ ev: 'run.footer', termination: { state: 'COMPLETE' } }), null);
});

test('the rejection event is itself in the schema, so it validates rather than compounding', () => {
  assert.ok('trace.rejected' in SCHEMA);
  assert.equal(rejectReason({ ev: 'trace.rejected', rejected_ev: 'tool.requested', reason: 'x' }), null);
});
