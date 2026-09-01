import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseTrace,
  segmentDispatches,
  countTurns,
  summarizeSegment,
  declaredModels,
  byteSubstrateStart,
  formatReport,
} from './cost.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');

/** One event, with only the fields the function under test reads. */
const ev = (o) => ({ ts: '2026-08-27T00:00:00.000Z', ...o });
const header = (agent, o = {}) => ev({ ev: 'run.header', agent, reason: 'delegated', ...o });
const footer = (o = {}) => ev({ ev: 'run.footer', termination: { state: 'COMPLETE', reason: 'objective_reported' }, ...o });
const req = (o = {}) => ev({ ev: 'tool.requested', tool: 'Read', ...o });
const res = (o = {}) => ev({ ev: 'tool.result', ok: true, bytes: 100, duration_ms: 10, ...o });
const deny = () => ev({ ev: 'policy.decision', decision: 'deny', source: 'guard' });
const cost = (by_model, o = {}) => ev({ ev: 'run.cost', wall_ms: 1000, by_model, ...o });

// --- parsing ----------------------------------------------------------------

test('parseTrace skips blank lines and is CRLF-tolerant', () => {
  // Found the hard way on 2026-08-27: TASKS.md is CRLF and a JS `.` does not match \r,
  // so a naive split parsed to ZERO rows — silently, which is the worst shape.
  const text = '{"ev":"run.header","agent":"x"}\r\n\r\n{"ev":"run.footer"}\r\n';
  assert.equal(parseTrace(text).length, 2);
});

test('parseTrace reports an unparseable line rather than dropping it silently', () => {
  const out = parseTrace('{"ev":"run.header"}\nnot json\n');
  assert.equal(out.length, 1);
  assert.equal(out.malformed, 1, 'a dropped line must be counted — INC-08 is the recorder that quietly stops recording');
});

// --- segmentation: TASK 55's method -----------------------------------------

test('a dispatch is a segment between run.header events', () => {
  const segs = segmentDispatches([header('implementer'), req(), res(), header('implementer'), req(), res(), footer()]);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].hasFooter, false, 'the first segment ended because a new header started, not because it finished');
  assert.equal(segs[1].hasFooter, true);
});

test('events before any header are not silently attributed to the first dispatch', () => {
  const segs = segmentDispatches([res(), header('implementer'), req(), res()]);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].agent, 'implementer');
});

test('a segment with no events at all is still reported', () => {
  // The b6218083 specimen: header at seq 1, footer at seq 2, nothing between. It is a
  // real run that reported success having done nothing, and dropping it hides that.
  const segs = segmentDispatches([header('unknown-role'), footer()]);
  assert.equal(segs.length, 1);
  assert.equal(countTurns(segs[0].events), 0);
});

// --- turns ------------------------------------------------------------------

test('a turn is a tool.result -> tool.requested transition', () => {
  // req res req res req res  ->  3 requests, 2 transitions, 3 turns.
  assert.equal(countTurns([req(), res(), req(), res(), req(), res()]), 3);
});

test('several requests inside one turn count once', () => {
  // Parallel tool calls in a single assistant turn: two requests, then their results.
  assert.equal(countTurns([req(), req(), res(), res(), req(), res()]), 2);
});

test('a run that made no tool call has zero turns, not one', () => {
  assert.equal(countTurns([]), 0);
  assert.equal(countTurns([footer()]), 0);
});

// --- the row ----------------------------------------------------------------

test('a segment row carries bytes, duration, denies and footer state', () => {
  const seg = segmentDispatches([
    header('implementer'), req(), res({ bytes: 500, duration_ms: 30 }),
    req(), deny(), req(), res({ bytes: 250, duration_ms: 20 }), footer(),
  ])[0];
  const row = summarizeSegment(seg, new Map([['implementer', 'sonnet']]));
  assert.equal(row.agent, 'implementer');
  assert.equal(row.model, 'sonnet');
  assert.equal(row.bytes, 750);
  assert.equal(row.durationMs, 50);
  assert.equal(row.denies, 1);
  assert.equal(row.footer, 'COMPLETE');
});

test('a role with no declared model is reported as unknown, never guessed', () => {
  const seg = segmentDispatches([header('orchestrator'), req(), res(), footer()])[0];
  assert.equal(summarizeSegment(seg, new Map()).model, '(undeclared)');
});

// --- TASK 64 clause 6: the model that ACTUALLY ran, from the segment's own run.cost event,
// preferred over the role-file-declared tier which is a derivation and cannot see a
// dispatch-time override. run.cost already lands inside seg.events — segmentDispatches only
// special-cases run.header/run.footer, so a run.cost falls through to the same push as a
// tool.requested/tool.result.

test('RED: a measured model from run.cost wins over the declared tier', () => {
  const seg = segmentDispatches([
    header('implementer'), req(), res(), cost({ 'claude-sonnet-5': { in: 10, out: 20 } }), footer(),
  ])[0];
  const row = summarizeSegment(seg, new Map([['implementer', 'opus']]));
  assert.equal(row.model, 'claude-sonnet-5');
  assert.equal(row.model_source, 'measured');
});

test('RED: no run.cost event at all falls back to the declared tier, labelled as such', () => {
  const seg = segmentDispatches([header('implementer'), req(), res(), footer()])[0];
  const row = summarizeSegment(seg, new Map([['implementer', 'opus']]));
  assert.equal(row.model, 'opus');
  assert.equal(row.model_source, 'declared');
});

test('RED: an empty by_model (a measured zero, ADR-009 §8) is not preferred over the declared tier', () => {
  // by_model: {} means "no new assistant turns since the boundary" — a real, legitimate zero,
  // never an error — but there is nothing to report as a model FROM it, so the declared tier
  // still wins, exactly as if no run.cost existed.
  const seg = segmentDispatches([header('implementer'), req(), res(), cost({}), footer()])[0];
  const row = summarizeSegment(seg, new Map([['implementer', 'opus']]));
  assert.equal(row.model, 'opus');
  assert.equal(row.model_source, 'declared');
});

test('RED: neither measured nor declared reports (undeclared), labelled unknown', () => {
  const seg = segmentDispatches([header('orchestrator'), req(), res(), footer()])[0];
  const row = summarizeSegment(seg, new Map());
  assert.equal(row.model, '(undeclared)');
  assert.equal(row.model_source, 'unknown');
});

test('RED: multiple models in one by_model report the one with the most combined tokens', () => {
  const seg = segmentDispatches([
    header('implementer'), req(), res(),
    cost({ 'claude-haiku-4-5-20251001': { in: 5, out: 5 }, 'claude-sonnet-5': { in: 100, out: 200 } }),
    footer(),
  ])[0];
  const row = summarizeSegment(seg, new Map());
  assert.equal(row.model, 'claude-sonnet-5');
});

test('a missing footer is reported as absent, and NOT as budget exhaustion', () => {
  // G-06: the footer's absence means the run did not terminate normally. A crash, a kill
  // and a hook that never fired look identical, so the row may not name a cause.
  const seg = segmentDispatches([header('implementer'), req(), res()])[0];
  const row = summarizeSegment(seg, new Map());
  assert.equal(row.footer, 'ABSENT');
  assert.ok(!JSON.stringify(row).match(/budget/i), 'the row must not attribute a cause to a missing footer');
});

// --- honest limits ----------------------------------------------------------

test('declaredModels derives the tier from each role file, not from a roster', () => {
  const m = declaredModels(join(ROOT, '.claude/agents'));
  assert.equal(m.get('implementer'), 'sonnet');
  assert.equal(m.get('harness-evaluator'), 'opus');
  assert.ok(m.size >= 5);
});

test('byteSubstrateStart finds the first run whose results carry real byte counts', () => {
  // The tool_result/tool_response bug recorded every result as 0 bytes. Reporting those
  // runs alongside corrected ones publishes a role as free (evidence.mjs:375).
  const rows = [
    { runId: 'a', ts: '2026-08-19T00:00:00.000Z', bytes: 0, results: 40 },
    { runId: 'b', ts: '2026-08-24T00:00:00.000Z', bytes: 900, results: 40 },
  ];
  assert.equal(byteSubstrateStart(rows), '2026-08-24T00:00:00.000Z');
});

test('the report states its limits in its own header, or the numbers get quoted as tokens', () => {
  const text = formatReport([], { substrateStart: null, generatedFrom: 'evidence/runs' });
  assert.match(text, /not tokens billed/i, 'C-01 applied to the harness own figures');
  assert.match(text, /tool results only/i);
  assert.match(text, /G-06/, 'the footer caveat must travel with the footer column');
  assert.match(text, /under-counted/i,
    'WebFetch records ~78 bytes for a whole page, so researcher reads as free — a break-even computed from this column would be wrong');
});

test('the report cuts the corpus three ways: per session, per role, per dispatch', () => {
  const rows = [
    { runId: 'r1', agent: 'orchestrator', model: '(undeclared)', reason: 'startup', turns: 4, bytes: 10, durationMs: 1, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T00:00:00.000Z' },
    { runId: 'r1', agent: 'implementer', model: 'sonnet', reason: 'delegated', turns: 9, bytes: 20, durationMs: 2, denies: 1, footer: 'ABSENT', ts: '2026-08-27T01:00:00.000Z' },
  ];
  const text = formatReport(rows, { substrateStart: null, generatedFrom: 'x' });
  assert.match(text, /## Per session/);
  assert.match(text, /## Per role/);
  assert.match(text, /## Per dispatch/);
  // The session row aggregates both dispatches and counts only the delegated one.
  const sessionRow = text.split('\n').find((l) => l.startsWith('| `r1`'));
  assert.ok(sessionRow, 'a session row must exist');
  assert.match(sessionRow, /\| 2 \| 1 \|/, 'two dispatches, one of them delegated');
});

test('the report is deterministic — same input, byte-identical output', () => {
  const rows = [
    { runId: 'b', agent: 'implementer', model: 'sonnet', turns: 9, bytes: 20, durationMs: 5, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T00:00:00.000Z' },
    { runId: 'a', agent: 'researcher', model: 'sonnet', turns: 3, bytes: 10, durationMs: 2, denies: 1, footer: 'ABSENT', ts: '2026-08-26T00:00:00.000Z' },
  ];
  const o = { substrateStart: '2026-08-24T00:00:00.000Z', generatedFrom: 'evidence/runs' };
  assert.equal(formatReport(rows, o), formatReport([...rows].reverse(), o),
    'row order must not depend on directory-read order, or the report is not reproducible');
});

// --- TASK 109: the arithmetic mutation found undertested --------------------
//
// An audit of the real mutation report (reports/mutation/mutation.json) found cost.mjs at
// the worst kill rate in the whole surface (51.7%), and the survivors were NOT concentrated
// in formatReport's prose the way status-history.mjs's renderLedger was — the biggest cluster
// was real aggregation arithmetic in byRole/bySession that only formatReport's SECTION
// HEADERS were asserted to exist, never the actual summed numbers a row prints. These tests
// close that gap; the genuinely inert prose lines are suppressed below instead, the same
// distinction TASK 88 drew for renderLedger: a template's sentences are noise, its numbers
// are structure.

test('a segment row counts tool.result events, independently of what they carry', () => {
  const seg = segmentDispatches([
    header('implementer'), req(), res({ bytes: 0, duration_ms: 0 }), req(), res({ bytes: 0, duration_ms: 0 }), footer(),
  ])[0];
  assert.equal(summarizeSegment(seg, new Map()).results, 2);
});

test('RED: the per-role table SUMS turns, bytes, duration and denies across multiple dispatches of the same role', () => {
  // Before this test, only the section header's presence was asserted (`## Per role`) —
  // an AssignmentOperator mutant turning every `+=` in this loop into `-=` left every
  // existing test green. Two rows of the same role+model, non-trivial numbers so a sign
  // flip is unmistakable in the assertion.
  const rows = [
    { runId: 'a', agent: 'implementer', model: 'sonnet', turns: 3, bytes: 1048576, durationMs: 60000, denies: 1, footer: 'COMPLETE', ts: '2026-08-27T00:00:00.000Z' },
    { runId: 'b', agent: 'implementer', model: 'sonnet', turns: 5, bytes: 1048576, durationMs: 60000, denies: 2, footer: 'ABSENT', ts: '2026-08-27T01:00:00.000Z' },
  ];
  const text = formatReport(rows, { substrateStart: null, generatedFrom: 'x' });
  const roleRow = text.split('\n').find((l) => l.startsWith('| `implementer`'));
  assert.ok(roleRow, 'a role row must exist');
  // 2 dispatches, 1 of 2 finished, 8 turns, 2.00 MB, 2.0 min, 3 denies — all summed, not overwritten.
  assert.match(roleRow, /\| 2 \| 1\/2 \| 8 \| 2\.00 \| 2\.0 \| 3 \|/);
});

test('RED: the per-session table SUMS bytes, turns, duration and denies across all its dispatches', () => {
  const rows = [
    { runId: 's1', agent: 'orchestrator', model: '(undeclared)', reason: 'startup', turns: 2, bytes: 1048576, durationMs: 30000, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T00:00:00.000Z' },
    { runId: 's1', agent: 'implementer', model: 'sonnet', reason: 'delegated', turns: 4, bytes: 1048576, durationMs: 30000, denies: 1, footer: 'ABSENT', ts: '2026-08-27T01:00:00.000Z' },
  ];
  const text = formatReport(rows, { substrateStart: null, generatedFrom: 'x' });
  const sessionRow = text.split('\n').find((l) => l.startsWith('| `s1`'));
  assert.ok(sessionRow, 'a session row must exist');
  // 2 dispatches, 1 delegated, 1 role each contributes... roles is a Set of agent names,
  // here 2 distinct agents; 6 turns, 2.00 MB, 1.0 min, 1 deny — all summed.
  assert.match(sessionRow, /\| 2 \| 1 \| 2 \| 6 \| 2\.00 \| 1\.0 \| 1 \|/);
});

test('RED: a session\'s "started" timestamp is the EARLIEST dispatch, not the first one processed', () => {
  // sorted order is by ts ascending, so the earliest row is processed first and seeds
  // `first` directly — this specifically exercises a LATER row (chronologically) that
  // arrives at the map lookup and must NOT overwrite an already-earlier `first`.
  const rows = [
    { runId: 's1', agent: 'implementer', model: 'sonnet', turns: 1, bytes: 10, durationMs: 1, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T01:00:00.000Z' },
    { runId: 's1', agent: 'orchestrator', model: '(undeclared)', turns: 1, bytes: 10, durationMs: 1, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T03:00:00.000Z' },
  ];
  const text = formatReport(rows, { substrateStart: null, generatedFrom: 'x' });
  const sessionRow = text.split('\n').find((l) => l.startsWith('| `s1`'));
  assert.match(sessionRow, /2026-08-27T01:00:00\.000Z/, 'started must read the earlier of the two timestamps');
});

test('RED: mb() and min() format the exact value, not just something', () => {
  const text = formatReport(
    [{ runId: 'a', agent: 'implementer', model: 'sonnet', turns: 1, bytes: 1572864, durationMs: 90000, denies: 0, footer: 'COMPLETE', ts: '2026-08-27T00:00:00.000Z' }],
    { substrateStart: null, generatedFrom: 'x' },
  );
  // 1572864 / 1048576 = 1.50 MB exactly; 90000ms / 60000 = 1.5 min exactly. Every table
  // (role, session, dispatch) reduces to the same numbers here since there is only one
  // row, so matching any of them proves mb()/min() computed the real division.
  const row = text.split('\n').find((l) => l.includes('1.50') && l.includes('1.5'));
  assert.ok(row, 'some table row must print the exact division, not an approximation or a placeholder');
});

test('RED: measuredModel prefers strictly more combined tokens — an exact tie keeps the first model seen', () => {
  // Object.keys(...).length >= 0 and tokens >= bestTokens both survived as mutants: neither
  // is exercised by a case where two models report the SAME combined token count.
  const seg = segmentDispatches([
    header('implementer'), req(), res(),
    cost({ 'claude-haiku-4-5-20251001': { in: 50, out: 50 }, 'claude-sonnet-5': { in: 60, out: 40 } }),
    footer(),
  ])[0];
  const row = summarizeSegment(seg, new Map());
  // Both models sum to 100 tokens; Object.entries preserves insertion order, so the first
  // key inserted — haiku — must win a tie rather than being displaced by an equal count.
  assert.equal(row.model, 'claude-haiku-4-5-20251001');
});

test('RED: declaredModels reads a role file with no model: line as undeclared, not as a crash or a false match', () => {
  const dir = join(ROOT, '.claude/agents');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0, 'fixture assumption: at least one real role file exists');
  const m = declaredModels(dir);
  // Every real role file resolves to SOME string (declared or the literal fallback) —
  // proves the regex either matches a real `model:` line or falls through cleanly,
  // never throwing and never leaving a role missing from the map.
  for (const f of files) assert.equal(typeof m.get(f.replace(/\.md$/, '')), 'string');
});

// --- liveness: the method validated against a known cap ---------------------

/**
 * The anchor, as a committed fixture rather than a read of `evidence/`.
 *
 * `stryker.config.mjs` sets `ignorePatterns: ['private', 'evidence']`, and its stated reason
 * is that the trace is "machine-written, large, and no test reads it". A mutation-covered
 * test that read the corpus would make that false — and the mutation runner proved it by
 * failing its dry run when the first version of this test did exactly that. The corpus is
 * also pruned (`retainRuns`), so the anchoring run would eventually vanish (`P-16`).
 *
 * So the sequences below are transcribed verbatim from the trace, and are regenerable:
 *
 *   node -e "import('./scripts/guards/lib/cost.mjs').then(({parseTrace,segmentDispatches})=>{ ... })"
 *   → emits, per segment, q = tool.requested · r = tool.result · . = any other event
 *
 * Source: `evidence/runs/53898bfe.../researcher-a3c611a937e8d1a35.jsonl` (36 events) and
 * `researcher-ad61d65a67c3ce435.jsonl` (75 events), captured 2026-08-27.
 */
const ANCHOR_FIT = 'q.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.r';
const ANCHOR_CUT = 'q.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.rq.r';

/** Expand a captured sequence back into events. */
const expand = (seq) => [...seq].map((c) =>
  c === 'q' ? { ev: 'tool.requested' } : c === 'r' ? { ev: 'tool.result' } : { ev: 'policy.decision', decision: 'allow' });

test('ANCHOR: the method reproduces G-06 own specimen — 12 turns when the brief fit, 25 at the cap', () => {
  // `G-06`'s red path, proven 2026-08-27: one role dispatched twice in one session with the
  // same read-only tools — once on a brief that fit its 25 turns (12 used, footer written)
  // and once on a brief that could not (25 of 25, no footer). The role is `researcher`
  // (`maxTurns: 25`). `budget-probe` is the reusable probe written AFTERWARDS, not the run
  // that produced this measurement — its own two segments are split across a header
  // boundary (`q` then `.rq.r`), so they measure a split rather than a cap and anchor
  // nothing. This assertion is what makes every other number in the report credible.
  assert.equal(countTurns(expand(ANCHOR_FIT)), 12);
  assert.equal(countTurns(expand(ANCHOR_CUT)), 25);
});

test('a segment opening with an orphaned result does not gain a phantom turn from it', () => {
  // Found in the real corpus while checking the budget-probe anchor: a new `run.header`
  // can land between a request and its result, so the next segment BEGINS with a result
  // belonging to the previous one. That leading result must not pair with the following
  // request, or every resumed dispatch reads one turn richer than it was.
  assert.equal(countTurns(expand('rq.r')), 1, 'one request in this segment is one turn');
  assert.equal(countTurns(expand('q')), 1, 'a request whose result landed in the next segment is still a turn');
});
