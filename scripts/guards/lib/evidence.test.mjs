import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

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
  posturePatch,
  costWindowStart,
  extractTokenUsage,
  traceFilePathFor,
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

test('RED: an empty or whitespace-only agent_type is treated as absent, not as a name', () => {
  // The runtime really does send agent_type: '' — 7 trace files on disk carry agent: "" and
  // are named -<agent_id>.jsonl because trace-writer.mjs composes the filename from it.
  // `??` only catches undefined/null, not the empty string, so this must fall back explicitly.
  assert.equal(runIdFor({ session_id: 's1', agent_id: 'a9', agent_type: '' }).agent, 'unknown-role');
  assert.equal(runIdFor({ session_id: 's1', agent_id: 'a9', agent_type: '   ' }).agent, 'unknown-role');
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

// --- TASK 18: the redaction scan stops matching inside opaque, generated ids ------
// tool_use_id, run_id and parent_run_id are opaque, API-generated random tokens, not authored
// text — a 4-character banned term appeared inside one during a real run and failed the gate
// on a true string match carrying zero confidentiality risk (INC-15's family). The exclusion
// is BY FIELD NAME, read from config, never a "looks like an id" heuristic that would widen
// itself over time.

const OPAQUE_FIELDS = ['tool_use_id', 'run_id', 'parent_run_id'];

test('RED: a banned term inside an opaque tool_use_id is not a redaction finding', () => {
  const bad = structuredClone(ok);
  const opaque = 'AcmeCore-abc123';
  bad[1].tool_use_id = opaque;
  bad[2].tool_use_id = opaque;
  bad[3].tool_use_id = opaque;
  const found = validateTrace(lines(bad), TERMS, '', { opaqueFields: OPAQUE_FIELDS });
  assert.ok(!found.some((f) => /redaction/i.test(f.message)), JSON.stringify(found));
});

test('the same term in a content-bearing field is still a redaction finding', () => {
  // The guard against over-narrowing: the exclusion must not swallow fields that actually
  // carry publishable content.
  const bad = structuredClone(ok);
  bad[1].target = { file_path: 'docs/AcmeCore-notes.md' };
  const found = validateTrace(lines(bad), TERMS, '', { opaqueFields: OPAQUE_FIELDS });
  assert.ok(found.some((f) => /redaction/i.test(f.message)), JSON.stringify(found));
});

test('the same term on a line that fails to parse still produces a redaction finding', () => {
  // Fail closed: a malformed line must never become a redaction blind spot.
  const text = `${JSON.stringify(ok[0])}\nnot json but has AcmeCore inside\n`;
  const found = validateTrace(text, TERMS, '', { opaqueFields: OPAQUE_FIELDS });
  assert.ok(found.some((f) => /redaction/i.test(f.message)), JSON.stringify(found));
});

test('the same term in a field nobody has thought of yet is still a redaction finding', () => {
  // The exclusion is a closed list of three names, never a pattern that widens itself.
  const bad = structuredClone(ok);
  bad[1].future_field = 'AcmeCore-value';
  const found = validateTrace(lines(bad), TERMS, '', { opaqueFields: OPAQUE_FIELDS });
  assert.ok(found.some((f) => /redaction/i.test(f.message)), JSON.stringify(found));
});

test('RED: a result with no matching request is reported', () => {
  const bad = structuredClone(ok);
  bad[3].tool_use_id = 'orphan';
  assert.ok(validateTrace(lines(bad), TERMS).some((f) => /orphan|no matching/i.test(f.message)));
});

// --- TASK 12 slice 3: a delivery loss is a distinct kind of finding ---------------
// H-03 means no agent may ever clear an orphan tool.result by editing the trace, so it must
// not fail the gate the same way a schema or seq defect does. Tagging it lets check-trace
// measure and floor it instead. The tag must stay narrow: only the shape 63 real orphans on
// disk actually took (an orphan tool.result), never anything else validateTrace reports.

test('RED: an orphan tool.result finding carries the delivery-loss kind, distinguishing it from a schema finding', () => {
  const bad = structuredClone(ok);
  bad[3].tool_use_id = 'orphan';
  const found = validateTrace(lines(bad), TERMS);
  const hit = found.find((f) => /no matching/i.test(f.message));
  assert.ok(hit, JSON.stringify(found));
  assert.equal(hit.kind, 'delivery_loss');
});

test('RED: a broken-seq finding never carries the delivery-loss kind — widening the tag must break this', () => {
  const bad = structuredClone(ok);
  bad[2].seq = 9; // gap between seq 2 and 4
  const found = validateTrace(lines(bad), TERMS);
  assert.ok(found.length > 0, 'the gap must still be reported');
  assert.ok(found.every((f) => f.kind !== 'delivery_loss'), JSON.stringify(found));
});

// --- TASK 18: a tool_use_id is never reused ---------------------------------------
// Correlation is the trace's whole claim: a request, its decision, its result. If two
// different tool calls share an id, the three-way correlation silently joins the wrong
// events and nothing says so. Scoped to tool.requested only — policy.decision and
// tool.result legitimately repeat the id of the request they belong to.

test('RED: a tool_use_id reused across two tool.requested events is reported', () => {
  const dup = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
    { ev: 'tool.requested', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: { command: 'ls' } },
    { ev: 'policy.decision', seq: 3, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool_use_id: 't1', decision: 'allow', source: 'guard' },
    { ev: 'tool.result', seq: 4, ts: '2026-08-18T10:00:02Z', run_id: 's1', tool_use_id: 't1', ok: true },
    { ev: 'tool.requested', seq: 5, ts: '2026-08-18T10:00:03Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: { command: 'ls -la' } },
    { ev: 'policy.decision', seq: 6, ts: '2026-08-18T10:00:03Z', run_id: 's1', tool_use_id: 't1', decision: 'allow', source: 'guard' },
    { ev: 'tool.result', seq: 7, ts: '2026-08-18T10:00:04Z', run_id: 's1', tool_use_id: 't1', ok: true },
  ];
  const found = validateTrace(lines(dup), TERMS);
  const hit = found.find((f) => /tool_use_id/.test(f.message) && /already used|reused|duplicate/i.test(f.message));
  assert.ok(hit, JSON.stringify(found));

  // The finding locates the collision by the earlier event's seq and NEVER prints the id.
  // INC-15 is exactly a banned term landing inside one by chance, so a validator that quoted
  // it would be the leak it is checking for — the same reason findings never quote a term.
  assert.match(hit.message, /seq 2/);
  assert.ok(!/\bt1\b/.test(hit.message), `the finding quotes the id: ${hit.message}`);
});

test('a policy.decision and a tool.result legitimately repeating their request tool_use_id is not flagged', () => {
  assert.deepEqual(validateTrace(lines(ok), TERMS), []);
});

test('RED: malformed JSON is a finding, not a crash', () => {
  assert.ok(validateTrace('{"ev":"run.header","seq":1}\nnot json at all\n', TERMS)
    .some((f) => /parse/i.test(f.message)));
});

test('an empty trace file is a finding — a run that recorded nothing recorded nothing', () => {
  assert.ok(validateTrace('', TERMS).some((f) => /empty/i.test(f.message)));
});

// --- TASK 12 slice 4: run.header is once per resume, never twice per start -------
// Decided, not derived from the corpus (the corpus cannot answer this — see the brief): a
// second run.header is legitimate when a real resume happened in between, and never
// legitimate when it directly follows another header, because that is one start recorded
// twice, not two starts.

test('RED: two adjacent run.header events describe one start recorded twice', () => {
  const bad = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
    { ev: 'run.header', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', permission_mode: 'default' },
  ];
  const found = validateTrace(lines(bad), TERMS);
  assert.ok(found.some((f) => /run\.header/.test(f.message) && /twice|resume/i.test(f.message)), JSON.stringify(found));
});

test('two run.header events separated by real events is a resume, not a finding', () => {
  const resumed = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default' },
    { ev: 'tool.requested', seq: 2, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: { command: 'ls' } },
    { ev: 'policy.decision', seq: 3, ts: '2026-08-18T10:00:01Z', run_id: 's1', tool_use_id: 't1', decision: 'allow', source: 'guard' },
    { ev: 'tool.result', seq: 4, ts: '2026-08-18T10:00:02Z', run_id: 's1', tool_use_id: 't1', ok: true },
    { ev: 'run.header', seq: 5, ts: '2026-08-18T10:00:03Z', run_id: 's1', permission_mode: 'default' },
  ];
  const found = validateTrace(lines(resumed), TERMS);
  assert.ok(!found.some((f) => /run\.header/.test(f.message) && /twice|resume/i.test(f.message)), JSON.stringify(found));
});

// --- TASK 12 slice 4: a header's reason comes from a declared vocabulary ---------
// Threaded through the same options argument as opaqueFields (TASK 12 slice 2's pattern),
// no reordering of existing parameters. An absent or empty vocabulary fails CLOSED: every
// present reason is then treated as undeclared, never silently accepted, because a check
// that quietly validates against nothing is worse than one that fails (G-13's reasoning).

const HEADER_REASONS = ['startup', 'delegated', 'observed'];

test('RED: a run.header reason outside the declared vocabulary is a finding', () => {
  const bad = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'resumed' },
  ];
  const found = validateTrace(lines(bad), TERMS, '', { traceHeaderReasons: HEADER_REASONS });
  assert.ok(found.some((f) => /reason/.test(f.message) && /resumed/.test(f.message)), JSON.stringify(found));
});

test('each declared header reason passes validation', () => {
  for (const reason of HEADER_REASONS) {
    const good = [
      { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default', reason },
    ];
    const found = validateTrace(lines(good), TERMS, '', { traceHeaderReasons: HEADER_REASONS });
    assert.ok(!found.some((f) => /reason/.test(f.message)), JSON.stringify(found));
  }
});

test('RED: an absent vocabulary fails closed — a declared-looking reason is still flagged', () => {
  // No traceHeaderReasons passed at all (the default, empty list). Fail-closed means this
  // must NOT be treated as "nothing to check against, so anything passes" — it means every
  // present reason is unverifiable and therefore a finding.
  const bad = [
    { ev: 'run.header', seq: 1, ts: '2026-08-18T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'startup' },
  ];
  const found = validateTrace(lines(bad), TERMS);
  assert.ok(found.some((f) => /reason/.test(f.message)), JSON.stringify(found));
});

test('a header with no reason field at all is not flagged by the vocabulary check', () => {
  // The vocabulary check targets a PRESENT, out-of-list reason. A header missing the field
  // entirely is a schema-completeness question SCHEMA does not raise (reason is not a
  // required field there), and is out of scope for this check.
  assert.deepEqual(validateTrace(lines(ok), TERMS), []);
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
  // The runtime sends tool_response as an OBJECT, not a string — captured from the real
  // payload, not from the docs (P-04). A string literal here asserts against a shape the
  // runtime does not send, so this exercises the object shape instead.
  const [ev] = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash',
    tool_response: { stdout: 'twelve bytes', stderr: '' }, duration_ms: 42 }, TERMS);
  assert.equal(ev.ok, true);
  assert.equal(ev.bytes, Buffer.byteLength(JSON.stringify({ stdout: 'twelve bytes', stderr: '' }), 'utf8'),
    'the byte count must measure the actual payload, not the constant length of "[object Object]"');
  assert.equal(ev.duration_ms, 42);
});

test('RED: two tool_response objects of different sizes produce two different byte counts', () => {
  // Property-based (P-13): today bytes() does String(obj), which stringifies every object to
  // the literal "[object Object]" — 15 bytes, always, regardless of actual payload size. That
  // measured NOTHING and was invisible because 15 looks like a healthy number. This asserts
  // the property that must hold rather than pinning today's constant.
  const small = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash',
    tool_response: { a: 1 } }, TERMS)[0];
  const large = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't2', tool_name: 'Bash',
    tool_response: { a: 'x'.repeat(500) } }, TERMS)[0];
  assert.notEqual(small.bytes, large.bytes);
});

test('RED: bytes() never throws — a circular tool_response must not crash the hook', () => {
  const circular = {};
  circular.self = circular;
  assert.doesNotThrow(() => {
    eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash',
      tool_response: circular }, TERMS);
  });
});

test('null and undefined tool_response still measure as zero bytes', () => {
  const nullEv = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash',
    tool_response: null }, TERMS)[0];
  const undefEv = eventsFor({ hook_event_name: 'PostToolUse', tool_use_id: 't1', tool_name: 'Bash' }, TERMS)[0];
  assert.equal(nullEv.bytes, 0);
  assert.equal(undefEv.bytes, 0);
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

// --- TASK 77: run.cost — SCHEMA row -----------------------------------------

test('RED: SCHEMA declares run.cost, requiring run_id and wall_ms', () => {
  assert.deepEqual(SCHEMA['run.cost'], ['run_id', 'wall_ms']);
});

test('RED: a run.cost event with wall_ms is accepted; without it, rejected', () => {
  assert.equal(rejectReason({ ev: 'run.cost', wall_ms: 1000, by_model: {} }), null);
  assert.match(rejectReason({ ev: 'run.cost', by_model: {} }), /wall_ms/);
});

// --- TASK 77: costWindowStart -------------------------------------------------
// The boundary a cost measurement counts from. Only a REAL resume boundary counts:
// posturePatch's own `run.header` with `reason: 'observed'` sits mid-dispatch, never at one,
// so treating it as a boundary would silently truncate the window to "since the permission
// mode was last observed" and under-count everything before it.

test('RED: no run.header and no run.cost anywhere returns null', () => {
  const text = lines([
    { ev: 'tool.requested', seq: 1, ts: '2026-08-28T10:00:00Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} },
  ]);
  assert.equal(costWindowStart(text), null);
});

test('RED: a single real run.header returns its own ts', () => {
  const text = lines([
    { ev: 'run.header', seq: 1, ts: '2026-08-28T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'startup' },
  ]);
  assert.equal(costWindowStart(text), '2026-08-28T10:00:00Z');
});

test('RED: an "observed" run.header planted between a real header and now is NOT the boundary — the real header still is', () => {
  const text = lines([
    { ev: 'run.header', seq: 1, ts: '2026-08-28T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'startup' },
    { ev: 'tool.requested', seq: 2, ts: '2026-08-28T10:00:01Z', run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} },
    { ev: 'run.header', seq: 3, ts: '2026-08-28T10:00:02Z', run_id: 's1', permission_mode: 'bypassPermissions', reason: 'observed' },
    { ev: 'tool.requested', seq: 4, ts: '2026-08-28T10:00:03Z', run_id: 's1', tool: 'Bash', tool_use_id: 't2', target: {} },
  ]);
  assert.equal(costWindowStart(text), '2026-08-28T10:00:00Z');
});

test('a "delegated" run.header counts as a real boundary, same as "startup"', () => {
  const text = lines([
    { ev: 'run.header', seq: 1, ts: '2026-08-28T09:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'delegated' },
  ]);
  assert.equal(costWindowStart(text), '2026-08-28T09:00:00Z');
});

test('RED: a prior run.cost event is a candidate boundary too — whichever ts is later wins', () => {
  const earlierHeader = lines([
    { ev: 'run.header', seq: 1, ts: '2026-08-28T09:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'startup' },
    { ev: 'run.cost', seq: 2, ts: '2026-08-28T09:30:00Z', run_id: 's1', wall_ms: 1800000, by_model: {} },
  ]);
  assert.equal(costWindowStart(earlierHeader), '2026-08-28T09:30:00Z');
});

test('RED: a run.header AFTER an earlier run.cost wins, since it is the later ts', () => {
  const text = lines([
    { ev: 'run.cost', seq: 1, ts: '2026-08-28T08:00:00Z', run_id: 's1', wall_ms: 1000, by_model: {} },
    { ev: 'run.header', seq: 2, ts: '2026-08-28T09:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'delegated' },
  ]);
  assert.equal(costWindowStart(text), '2026-08-28T09:00:00Z');
});

test('costWindowStart tolerates CRLF line endings and unparseable lines', () => {
  const text = `${JSON.stringify({ ev: 'run.header', seq: 1, ts: '2026-08-28T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'startup' })}\r\nnot json at all\r\n`;
  assert.equal(costWindowStart(text), '2026-08-28T10:00:00Z');
});

test('an empty existingTraceText returns null', () => {
  assert.equal(costWindowStart(''), null);
});

// --- TASK 77: extractTokenUsage -----------------------------------------------
// Pure. Parses a transcript's JSONL, CRLF-tolerant, and pulls exactly five NAMED numeric
// fields per assistant message, grouped by a VALIDATED model name. The transcript "holds
// everything that was said" (docs/harness/evidence.md), so nothing but named numbers and a
// vetted model key may reach the return value.

const transcriptLines = (msgs) => msgs.map((m) => JSON.stringify(m)).join('\n') + '\n';

test('RED: a single assistant message with usage extracts all five fields under its model', () => {
  const text = transcriptLines([
    {
      type: 'assistant', timestamp: '2026-08-28T10:00:00Z',
      message: {
        model: 'claude-sonnet-5',
        usage: {
          input_tokens: 100, output_tokens: 200,
          cache_creation_input_tokens: 30, cache_read_input_tokens: 40,
          output_tokens_details: { thinking_tokens: 10 },
        },
      },
    },
  ]);
  const result = extractTokenUsage(text, null);
  assert.deepEqual(result, {
    by_model: {
      'claude-sonnet-5': { in: 100, out: 200, cache_create: 30, cache_read: 40, thinking: 10 },
    },
  });
});

test('RED: two assistant messages under different models sum separately', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00Z',
      message: { model: 'claude-opus-5', usage: { input_tokens: 5, output_tokens: 6, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01Z',
      message: { model: 'claude-sonnet-5', usage: { input_tokens: 1, output_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:02Z',
      message: { model: 'claude-opus-5', usage: { input_tokens: 3, output_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } },
  ]);
  const result = extractTokenUsage(text, null);
  assert.equal(result.by_model['claude-opus-5'].in, 8);
  assert.equal(result.by_model['claude-opus-5'].out, 10);
  assert.equal(result.by_model['claude-sonnet-5'].in, 1);
});

test('RED: a missing or non-numeric usage field defaults to 0, never throws', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00Z',
      message: { model: 'claude-sonnet-5', usage: { input_tokens: 'not-a-number', output_tokens: null } } },
  ]);
  const result = extractTokenUsage(text, null);
  assert.deepEqual(result.by_model['claude-sonnet-5'], { in: 0, out: 0, cache_create: 0, cache_read: 0, thinking: 0 });
});

test('RED: lines that are not type "assistant", or that carry no message.usage, are skipped', () => {
  const text = transcriptLines([
    { type: 'user', timestamp: '2026-08-28T10:00:00Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 999 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01Z', message: { model: 'claude-sonnet-5' } },
  ]);
  assert.deepEqual(extractTokenUsage(text, null), { by_model: {} });
});

test('RED: sinceTs filters out messages at or before the boundary, keeping only strictly later ones', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 1, output_tokens: 1 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:00Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 2, output_tokens: 2 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 4, output_tokens: 4 } } },
  ]);
  const result = extractTokenUsage(text, '2026-08-28T10:00:00Z');
  assert.equal(result.by_model['claude-sonnet-5'].in, 4);
});

test('a null sinceTs includes every assistant usage line in the transcript', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T09:00:00Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 1 } } },
  ]);
  assert.equal(extractTokenUsage(text, null).by_model['claude-sonnet-5'].in, 1);
});

test('an empty by_model is a legitimate, correct answer — never treated as an error', () => {
  assert.deepEqual(extractTokenUsage('', null), { by_model: {} });
  assert.deepEqual(extractTokenUsage('not json at all\n', null), { by_model: {} });
});

test('extractTokenUsage tolerates CRLF line endings and an unparseable line', () => {
  const text = `${JSON.stringify({ type: 'assistant', timestamp: '2026-08-28T10:00:00Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 7 } } })}\r\nnot json\r\n`;
  assert.equal(extractTokenUsage(text, null).by_model['claude-sonnet-5'].in, 7);
});

test('real-shaped model names — including a dated snapshot suffix — validate and key by the raw string', () => {
  for (const model of ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5-20251001']) {
    const text = transcriptLines([
      { type: 'assistant', timestamp: '2026-08-28T10:00:00Z', message: { model, usage: { input_tokens: 1 } } },
    ]);
    const result = extractTokenUsage(text, null);
    assert.ok(model in result.by_model, `${model} did not key its own bucket: ${JSON.stringify(result)}`);
  }
});

// --- TASK 77 follow-up: dedup by message.id -----------------------------------
// Claude Code's transcript writes ONE JSONL LINE PER CONTENT BLOCK, not one per logical
// assistant message: a single turn's thinking/text/tool_use blocks share one `message.id`,
// each carrying its own `usage` snapshot, and `output_tokens` GROWS across snapshots of the
// same id (measured on a real transcript: one message went 4 -> 298 across two lines, 1.5s
// apart, same id). Summing every qualifying line independently overcounts almost every field.
// The fix: keep only the LAST occurrence per `message.id` in file order (file order is
// chronological, so the last snapshot is the most complete one — this holds regardless of
// `stop_reason`, which is inconsistently populated and must not be keyed off), then sum one
// `usage` object per unique id.

test('RED: multiple lines sharing one message.id are deduplicated to the LAST snapshot, never summed', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.000Z', message: { id: 'msg_1', model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 2, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.500Z', message: { id: 'msg_1', model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 2, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01.500Z', message: { id: 'msg_1', model: 'claude-sonnet-5', usage: { input_tokens: 100, output_tokens: 47, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 } } },
  ]);
  const result = extractTokenUsage(text, null);
  // The LAST snapshot's usage (out: 47) — never the sum of all three (out: 51) and never the
  // first line's (out: 2).
  assert.deepEqual(result.by_model['claude-sonnet-5'], { in: 100, out: 47, cache_create: 30, cache_read: 40, thinking: 0 });
});

test('RED: two distinct message.id values, each spanning multiple snapshot lines, are each counted exactly once — never merged into each other', () => {
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.000Z', message: { id: 'msg_a', model: 'claude-sonnet-5', usage: { input_tokens: 10, output_tokens: 1 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.500Z', message: { id: 'msg_a', model: 'claude-sonnet-5', usage: { input_tokens: 10, output_tokens: 5 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01.000Z', message: { id: 'msg_b', model: 'claude-sonnet-5', usage: { input_tokens: 20, output_tokens: 2 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:01.500Z', message: { id: 'msg_b', model: 'claude-sonnet-5', usage: { input_tokens: 20, output_tokens: 9 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:02.000Z', message: { id: 'msg_b', model: 'claude-sonnet-5', usage: { input_tokens: 20, output_tokens: 15 } } },
  ]);
  const result = extractTokenUsage(text, null);
  // msg_a's last snapshot (in 10, out 5) + msg_b's last snapshot (in 20, out 15) = in 30, out 20.
  // NOT the sum of all five lines (in 80, out 32), and NOT the two ids collapsed into one.
  assert.deepEqual(result.by_model['claude-sonnet-5'], { in: 30, out: 20, cache_create: 0, cache_read: 0, thinking: 0 });
});

test('a line with no message.id at all is never merged with another id-less line — each keeps its own count', () => {
  // Not an observed real-transcript shape, but not assumed away either: two id-less lines
  // must not collide with each other the way two same-id lines correctly do.
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.000Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 1, output_tokens: 1 } } },
    { type: 'assistant', timestamp: '2026-08-28T10:00:00.500Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 2, output_tokens: 2 } } },
  ]);
  const result = extractTokenUsage(text, null);
  assert.deepEqual(result.by_model['claude-sonnet-5'], { in: 3, out: 3, cache_create: 0, cache_read: 0, thinking: 0 });
});

// --- TASK 77: T-04, the central red-path test -------------------------------
// message.model is TRANSCRIPT TEXT — the ledger this codebase treats as "everything that was
// said," never something the trace may copy verbatim (docs/harness/evidence.md). A
// non-matching value must bucket under the fixed sentinel "unknown-model", NEVER under the
// raw string, which would otherwise be a second, unaudited path for arbitrary text (including
// a confidential term) to reach the trace as an object key. The planted string is a synthetic
// placeholder shaped like something that COULD be a banned term — never a real one (H-04).

test('RED: T-04 — a private/-shaped model string never appears anywhere in the output, not as a key or a value', () => {
  const poison = 'internal-system-zephyr';
  const text = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:00Z', message: { model: poison, usage: { input_tokens: 42, output_tokens: 7 } } },
  ]);
  const result = extractTokenUsage(text, null);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(poison), `the poisoned model string leaked into the output: ${serialized}`);
  assert.ok('unknown-model' in result.by_model, `expected the sentinel bucket to hold the usage: ${serialized}`);
  assert.equal(result.by_model['unknown-model'].in, 42);
});

// --- TASK 77: traceFilePathFor ------------------------------------------------
// Pure, string-building only, no I/O. Reproduces trace-writer.mjs's own inline file-naming
// logic exactly, so a hook reading "the file record() would write to" gets the same path
// record() itself computes.

test('RED: traceFilePathFor matches the orchestrator path record() would compute', () => {
  const input = { session_id: 's1' };
  const expected = join(ROOT, 'evidence/runs', 's1', 'orchestrator.jsonl');
  assert.equal(traceFilePathFor(ROOT, input), expected);
});

test('RED: traceFilePathFor matches the delegated path record() would compute', () => {
  const input = { session_id: 's1', agent_id: 'a9', agent_type: 'implementer' };
  const expected = join(ROOT, 'evidence/runs', 's1', 'implementer-a9.jsonl');
  assert.equal(traceFilePathFor(ROOT, input), expected);
});

test('traceFilePathFor slugs a session_id and agent_id the same way record() does', () => {
  const input = { session_id: 'weird/session:id', agent_id: 'a?9', agent_type: 'implementer' };
  const expected = join(ROOT, 'evidence/runs', 'weird_session_id', 'implementer-a_9.jsonl');
  assert.equal(traceFilePathFor(ROOT, input), expected);
});

test('traceFilePathFor falls back to "unknown-role" for an empty agent_type, matching runIdFor', () => {
  const input = { session_id: 's1', agent_id: 'a9', agent_type: '' };
  const expected = join(ROOT, 'evidence/runs', 's1', 'unknown-role-a9.jsonl');
  assert.equal(traceFilePathFor(ROOT, input), expected);
});

// --- TASK 77: eventsFor emits [run.footer, run.cost] on SubagentStop / SessionEnd ---
// The by_model-absent-vs-empty distinction is the whole of the measured-zero-vs-unmeasured
// contract: opts.transcriptError set means NO by_model key at all; otherwise, even a genuinely
// empty usage extraction means by_model IS present, as {}.

test('RED: SubagentStop now emits two events — the existing run.footer, plus a run.cost', () => {
  const input = { hook_event_name: 'SubagentStop', session_id: 's1', agent_id: 'a9', agent_type: 'implementer' };
  const events = eventsFor(input, [], {});
  assert.equal(events.length, 2);
  assert.equal(events[0].ev, 'run.footer');
  assert.equal(events[1].ev, 'run.cost');
});

test('RED: SessionEnd now emits two events — the existing run.footer, plus a run.cost', () => {
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const events = eventsFor(input, [], {});
  assert.equal(events.length, 2);
  assert.equal(events[0].ev, 'run.footer');
  assert.equal(events[1].ev, 'run.cost');
});

test('RED: run.cost sums token usage from opts.transcriptText, windowed from opts.existingTraceText', () => {
  const existingTraceText = lines([
    { ev: 'run.header', seq: 1, ts: '2026-08-28T10:00:00Z', run_id: 's1', permission_mode: 'default', reason: 'delegated' },
  ]);
  const transcriptText = transcriptLines([
    { type: 'assistant', timestamp: '2026-08-28T10:00:01Z', message: { model: 'claude-sonnet-5', usage: { input_tokens: 50, output_tokens: 60 } } },
  ]);
  const input = { hook_event_name: 'SubagentStop', session_id: 's1', agent_id: 'a9', agent_type: 'implementer' };
  const [, costEv] = eventsFor(input, [], { existingTraceText, transcriptText });
  assert.equal(costEv.ev, 'run.cost');
  assert.deepEqual(costEv.by_model, {
    'claude-sonnet-5': { in: 50, out: 60, cache_create: 0, cache_read: 0, thinking: 0 },
  });
});

test('RED: run.cost carries wall_ms computed from Date.now() minus the window-start ts', () => {
  const startTs = new Date(Date.now() - 5000).toISOString();
  const existingTraceText = lines([
    { ev: 'run.header', seq: 1, ts: startTs, run_id: 's1', permission_mode: 'default', reason: 'startup' },
  ]);
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const [, costEv] = eventsFor(input, [], { existingTraceText, transcriptText: '' });
  assert.ok(costEv.wall_ms >= 4900 && costEv.wall_ms < 60000, `wall_ms out of expected range: ${costEv.wall_ms}`);
});

test('RED: with no prior boundary at all, wall_ms is null rather than a fabricated number', () => {
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const [, costEv] = eventsFor(input, [], { existingTraceText: '', transcriptText: '' });
  assert.equal(costEv.wall_ms, null);
});

test('RED: a malformed boundary ts (Date.parse -> NaN) also yields wall_ms null, never NaN', () => {
  const existingTraceText = lines([
    { ev: 'run.header', seq: 1, ts: 'not-a-real-timestamp', run_id: 's1', permission_mode: 'default', reason: 'startup' },
  ]);
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const [, costEv] = eventsFor(input, [], { existingTraceText, transcriptText: '' });
  assert.equal(costEv.wall_ms, null);
});

test('RED: opts.transcriptError present means run.cost carries error_class and NO by_model key at all — not by_model: {}', () => {
  const input = { hook_event_name: 'SubagentStop', session_id: 's1', agent_id: 'a9', agent_type: 'implementer' };
  const [, costEv] = eventsFor(input, [], { existingTraceText: '', transcriptError: 'not_found' });
  assert.equal(costEv.error_class, 'not_found');
  assert.equal('by_model' in costEv, false, `by_model must be absent, not present: ${JSON.stringify(costEv)}`);
});

test('RED: no transcriptError, and a genuinely empty transcript, still yields by_model PRESENT as {} — a measured zero, not an absence', () => {
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const [, costEv] = eventsFor(input, [], { existingTraceText: '', transcriptText: '' });
  assert.equal('by_model' in costEv, true, 'by_model must be present even when empty');
  assert.deepEqual(costEv.by_model, {});
});

test('an absent opts still produces a run.cost event with a defaulted-empty transcript', () => {
  const input = { hook_event_name: 'SessionEnd', session_id: 's1' };
  const events = eventsFor(input, [], {});
  const costEv = events.find((e) => e.ev === 'run.cost');
  assert.ok(costEv);
  assert.deepEqual(costEv.by_model, {});
});

test('the rejection event is itself in the schema, so it validates rather than compounding', () => {
  assert.ok('trace.rejected' in SCHEMA);
  assert.equal(rejectReason({ ev: 'trace.rejected', rejected_ev: 'tool.requested', reason: 'x' }), null);
});

// --- TASK 12 slice 3: check-trace's floor on the measured loss rate ---------------
// No colocated gate/check-trace.test.mjs exists in this slice's owned files, and gate/**
// scripts here are otherwise driven only via the whole gate (T-09) — check-terms.mjs is the
// one exception, and it proves the pattern this reuses: a `--root` override plus a fixture
// tree, spawned in a child process, so the CLI's own exit code and printed rate are what gets
// asserted rather than a reimplementation of its logic (P-14, T-02).

const CHECK_TRACE_CLI = join(ROOT, 'scripts/guards/gate/check-trace.mjs');

/** A synthetic trace: `matched` complete request/decision/result triples, plus `orphanResults`
 * tool.result events with no matching tool.requested — the exact shape of a delivery loss. */
function fixtureTrace({ matched = 0, orphanResults = 0 } = {}) {
  const lines = [];
  let seq = 1;
  const push = (fields) => lines.push(JSON.stringify({ seq: seq++, ts: '2026-08-27T00:00:00Z', run_id: 'fx', ...fields }));
  push({ ev: 'run.header', permission_mode: 'default' });
  for (let i = 0; i < matched; i++) {
    const id = `req-${i}`;
    push({ ev: 'tool.requested', tool: 'Bash', tool_use_id: id, target: { command: 'ls' } });
    push({ ev: 'policy.decision', tool_use_id: id, decision: 'allow', source: 'guard' });
    push({ ev: 'tool.result', tool_use_id: id, ok: true });
  }
  for (let i = 0; i < orphanResults; i++) {
    push({ ev: 'tool.result', tool_use_id: `orphan-${i}`, ok: true });
  }
  return lines.join('\n') + '\n';
}

/** A fixture repository check-trace can run `--root` against: real config (with the floor
 * overridden), wiring for every recorded hook event, the hook file's mere existence, and one
 * trace file — or none, to prove the zero-over-zero edge. */
function fixtureRoot({ maxRequestLossRate, traceText }) {
  const dir = mkdtempSync(join(tmpdir(), 'check-trace-'));
  const put = (rel, body) => {
    mkdirSync(join(dir, dirname(rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  };
  const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
  cfg.evidence.maxRequestLossRate = maxRequestLossRate;
  put('scripts/guards/guards.config.json', JSON.stringify(cfg));
  put('scripts/guards/hooks/record-event.mjs', '// fixture stub — existence only, never executed\n');
  const hooks = {};
  for (const ev of cfg.evidence.recordedHookEvents) {
    hooks[ev] = [{ matcher: '*', hooks: [{ type: 'command', command: 'node scripts/guards/hooks/record-event.mjs' }] }];
  }
  put('.claude/settings.json', JSON.stringify({ hooks }));
  if (traceText !== undefined) put('evidence/runs/run1/trace.jsonl', traceText);
  return dir;
}

function runCheckTrace(dir) {
  const r = spawnSync(process.execPath, [CHECK_TRACE_CLI, '--root', dir], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

const withFixtureRoot = (opts, fn) => {
  const dir = fixtureRoot(opts);
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('RED: at the measured floor, a corpus at exactly that loss rate passes and prints the rate', () => {
  // 1 orphan in 50 tool.result events = 2%, equal to (not above) the floor.
  const trace = fixtureTrace({ matched: 49, orphanResults: 1 });
  withFixtureRoot({ maxRequestLossRate: 0.02, traceText: trace }, (dir) => {
    const { status, out } = runCheckTrace(dir);
    assert.equal(status, 0, out);
    assert.match(out, /1\/50/);
  });
});

test('RED: the same corpus fails when the floor is 0 — the rate is measured, not waived', () => {
  const trace = fixtureTrace({ matched: 49, orphanResults: 1 });
  withFixtureRoot({ maxRequestLossRate: 0, traceText: trace }, (dir) => {
    const { status, out } = runCheckTrace(dir);
    assert.equal(status, 1, out);
    assert.match(out, /1\/50/);
  });
});

test('RED: an ordinary schema defect fails at any floor, including a floor of 1', () => {
  // A gap in seq, zero delivery-loss orphans — the separation this whole slice exists for.
  const lines = fixtureTrace({ matched: 3, orphanResults: 0 }).trim().split('\n');
  const bad = JSON.parse(lines[2]);
  bad.seq = 99;
  lines[2] = JSON.stringify(bad);
  const trace = lines.join('\n') + '\n';
  withFixtureRoot({ maxRequestLossRate: 1, traceText: trace }, (dir) => {
    const { status, out } = runCheckTrace(dir);
    assert.equal(status, 1, out);
    assert.match(out, /seq/);
  });
});

test('RED: a fresh clone with no trace at all reports a clean zero-over-zero, never NaN, and passes', () => {
  withFixtureRoot({ maxRequestLossRate: 0, traceText: undefined }, (dir) => {
    const { status, out } = runCheckTrace(dir);
    assert.equal(status, 0, out);
    assert.ok(!/NaN/.test(out), out);
    assert.match(out, /0\/0/);
  });
});

// --- TASK 12 slice 5: the observed posture header ---------------------------
// G-04 promises that permission_mode is recorded so a bypassed run is visible to the
// evaluator. SessionStart/SubagentStart payloads genuinely omit it; PostToolUse and
// PostToolUseFailure carry the real value (POST_TOOL_USE_KEYS above, captured from the
// running tool). `posturePatch` is the pure bridge: given the text already on disk and a
// candidate mode, decide whether a fresh `run.header` should record the real posture.

const jl = (e) => JSON.stringify(e) + '\n';

test('RED: a real mode that differs from the last recorded header produces an observed header', () => {
  // The header is NOT the last event in the text — a tool.requested follows it — so the
  // adjacency rule (behavior 3, below) does not apply here.
  const text = jl({ ev: 'run.header', seq: 1, run_id: 's1', permission_mode: 'unknown', reason: 'startup' })
    + jl({ ev: 'tool.requested', seq: 2, run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} });
  const patch = posturePatch(text, 'default');
  assert.equal(patch.ev, 'run.header');
  assert.equal(patch.permission_mode, 'default');
  assert.equal(patch.reason, 'observed');
});

test('RED: a candidate of "unknown", or one equal to the mode already recorded, produces nothing', () => {
  const text = jl({ ev: 'run.header', seq: 1, run_id: 's1', permission_mode: 'default', reason: 'startup' })
    + jl({ ev: 'tool.requested', seq: 2, run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} });
  assert.equal(posturePatch(text, 'unknown'), null);
  assert.equal(posturePatch(text, 'default'), null);
});

test('RED: a text whose last event is a run.header produces nothing, even when the mode differs', () => {
  // Load-bearing (slice 4 + this brief): pretooluse.mjs calls record() on the very first tool
  // call of a run, which lands immediately after the startup header. Without this guard the
  // writer would emit a finding against itself — an adjacent run.header pair — on every trace.
  const text = jl({ ev: 'run.header', seq: 1, run_id: 's1', permission_mode: 'default', reason: 'startup' });
  assert.equal(posturePatch(text, 'bypassPermissions'), null);
});

test('RED: an empty trace (a brand-new run file) with a real mode emits a header — nothing has been observed yet', () => {
  // Chosen behavior: no baseline recorded means the real mode is new information worth
  // capturing immediately, and there is no prior header to be adjacent to. This is also what
  // trace-writer.test.mjs's first `record()` call against an empty file depends on.
  const patch = posturePatch('', 'default');
  assert.equal(patch.ev, 'run.header');
  assert.equal(patch.permission_mode, 'default');
  assert.equal(patch.reason, 'observed');
});

test('RED: a mode change — default recorded, bypassPermissions observed — produces a header', () => {
  // The case G-04 exists for: a mid-session switch to bypassPermissions must not be assumed
  // away as unchanged.
  const text = jl({ ev: 'run.header', seq: 1, run_id: 's1', permission_mode: 'default', reason: 'startup' })
    + jl({ ev: 'tool.requested', seq: 2, run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} });
  const patch = posturePatch(text, 'bypassPermissions');
  assert.equal(patch.ev, 'run.header');
  assert.equal(patch.permission_mode, 'bypassPermissions');
  assert.equal(patch.reason, 'observed');
});

test('a candidate that is not a real string (missing, empty, non-string) produces nothing', () => {
  const text = jl({ ev: 'run.header', seq: 1, run_id: 's1', permission_mode: 'unknown', reason: 'startup' })
    + jl({ ev: 'tool.requested', seq: 2, run_id: 's1', tool: 'Bash', tool_use_id: 't1', target: {} });
  assert.equal(posturePatch(text, undefined), null);
  assert.equal(posturePatch(text, ''), null);
  assert.equal(posturePatch(text, null), null);
});
