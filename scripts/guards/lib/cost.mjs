// What a run costs, read from the trace. TASK 70.
//
// Every proposal about slice seams, delegation break-even and model tiers was a guess,
// because nothing reported what a run cost. The substrate already existed and was unused:
// every `tool.result` carries `bytes` and `duration_ms`, written by a hook the scored agent
// cannot edit (`H-03`). This module turns that into rows; the CLI beside it prints them.
//
// It is REPORT-ONLY and deliberately not a failing gate step. A cost figure is not yet a
// pass/fail property, and a step that fails on a number nobody has calibrated is noise.
//
// Pure functions only — no filesystem here except `declaredModels`, which reads the role
// files it derives from. That keeps the logic inside the mutation-covered surface (`D3`).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * JSONL → events, CRLF-tolerant, counting what it could not parse.
 *
 * The CRLF half is not hypothetical: a sibling script split on `\n` alone, left a stray
 * `\r` on every line, and parsed the register to ZERO rows without erroring. A parser that
 * fails to empty is worse than one that throws, because empty looks like an answer.
 *
 * `malformed` rides on the array rather than being thrown: a torn trace line should narrow
 * the report, not abort it, but it may never vanish (`INC-08` is the recorder that quietly
 * stops recording).
 */
export function parseTrace(text) {
  const out = [];
  let malformed = 0;
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      malformed += 1;
    }
  }
  out.malformed = malformed;
  return out;
}

/**
 * Split an event stream into dispatches. `TASK 55`'s method, reused rather than reinvented:
 * a dispatch — the unit `maxTurns` applies to — is a **segment between `run.header` events**,
 * because a resume gets a fresh header and a fresh budget.
 *
 * Events before the first header belong to no dispatch and are dropped rather than folded
 * into the first one, which would inflate whichever segment happened to be first.
 */
export function segmentDispatches(events) {
  const segs = [];
  let cur = null;
  for (const e of events) {
    if (e.ev === 'run.header') {
      cur = { agent: e.agent ?? '', reason: e.reason ?? '', ts: e.ts ?? null, events: [], hasFooter: false, footer: null };
      segs.push(cur);
      continue;
    }
    if (!cur) continue;
    if (e.ev === 'run.footer') {
      cur.hasFooter = true;
      cur.footer = e.termination?.state ?? 'COMPLETE';
      continue;
    }
    cur.events.push(e);
  }
  return segs;
}

/**
 * Turns in one dispatch. `TASK 55`: a turn is observable as a transition from `tool.result`
 * to `tool.requested`. No event carries a turn count — reading for one is what made an
 * earlier triage conclude turns were unrecoverable.
 *
 * Counted as (transitions + 1) when any request exists, so a single-turn run reads 1 rather
 * than 0. Several requests before their results are ONE turn: that is a parallel tool call,
 * which is exactly what the transition rule is for.
 */
export function countTurns(events) {
  let turns = 0;
  let sawRequest = false;
  let lastWasResult = false;
  for (const e of events) {
    if (e.ev === 'tool.requested') {
      if (lastWasResult) turns += 1;
      sawRequest = true;
      lastWasResult = false;
    } else if (e.ev === 'tool.result') {
      // Only a result that answers a request IN THIS SEGMENT can open the next turn. A
      // `run.header` can land between a request and its result, so a resumed dispatch
      // begins with an orphaned result belonging to the previous one — pairing that with
      // the following request would read every resumed dispatch one turn richer than it was.
      if (sawRequest) lastWasResult = true;
    }
  }
  return sawRequest ? turns + 1 : 0;
}

/**
 * TASK 64 clause 6 — the model that ACTUALLY ran, read from the segment's own `run.cost`
 * event when one exists and measured something, rather than derived from the role file.
 *
 * `run.cost` lands inside `seg.events` already: `segmentDispatches` special-cases only
 * `run.header`/`run.footer`, so this needed no change there. An empty `by_model: {}` is a
 * legitimate MEASURED zero (`ADR-009` §8 — no new assistant turns since the boundary) and is
 * treated the same as no `run.cost` at all: there is nothing to name a model FROM. When more
 * than one model appears (a resumed dispatch can in principle straddle two), the one with the
 * most combined input+output tokens is reported — the model that did the work, not a
 * transient interruption.
 */
function measuredModel(seg) {
  const costEvent = seg.events.find((e) => e.ev === 'run.cost' && e.by_model && Object.keys(e.by_model).length > 0);
  if (!costEvent) return null;
  let best = null;
  let bestTokens = -1;
  for (const [name, usage] of Object.entries(costEvent.by_model)) {
    const tokens = (usage.in ?? 0) + (usage.out ?? 0);
    if (tokens > bestTokens) { best = name; bestTokens = tokens; }
  }
  return best;
}

/**
 * One dispatch → one row.
 *
 * `footer` is a literal of what is on disk: `COMPLETE`, or `ABSENT` when none was written.
 * **It never names a cause.** `G-06` is explicit that a missing footer means the run did not
 * terminate normally, not that a budget stopped it — a crash, a kill and a hook that never
 * fired look identical, and `harness-evaluator` holds the standing counterexample of two
 * footerless segments at ~32 turns against a cap of 60.
 *
 * `model` prefers a MEASUREMENT over a derivation (`TASK 64` clause 6): the role-file tier in
 * `models` can never see a dispatch-time override, so a real `run.cost.by_model` wins when one
 * exists. `model_source` says which won — `measured`, `declared`, or `unknown` when neither
 * is available — so a reader is never left guessing which kind of number they are looking at.
 */
export function summarizeSegment(seg, models = new Map()) {
  let bytes = 0;
  let durationMs = 0;
  let denies = 0;
  let results = 0;
  for (const e of seg.events) {
    if (e.ev === 'tool.result') {
      results += 1;
      if (typeof e.bytes === 'number') bytes += e.bytes;
      if (typeof e.duration_ms === 'number') durationMs += e.duration_ms;
    } else if (e.ev === 'policy.decision' && e.decision === 'deny') {
      denies += 1;
    }
  }
  const measured = measuredModel(seg);
  const declared = models.get(seg.agent);
  return {
    agent: seg.agent,
    model: measured ?? declared ?? '(undeclared)',
    model_source: measured ? 'measured' : declared ? 'declared' : 'unknown',
    reason: seg.reason,
    ts: seg.ts,
    turns: countTurns(seg.events),
    bytes,
    results,
    durationMs,
    denies,
    footer: seg.hasFooter ? seg.footer : 'ABSENT',
  };
}

/**
 * Role → the model tier its own file declares (`P-13`: a property, not a roster).
 *
 * This is a FALLBACK now, not the primary source (`TASK 64` clause 6 replaced the derivation
 * with a measurement): `run.header` still carries a real `model` only on `reason: startup` —
 * every delegated header `null` — so this stays the answer for a segment whose own
 * `run.cost.by_model` is absent or empty. `summarizeSegment` prefers the measurement and
 * falls back here; `model_source` on the row says which one a reader is looking at.
 */
export function declaredModels(agentsDir) {
  const out = new Map();
  for (const f of readdirSync(agentsDir)) {
    if (!f.endsWith('.md')) continue;
    const m = readFileSync(join(agentsDir, f), 'utf8').match(/^model:\s*(\S+)/m);
    out.set(f.replace(/\.md$/, ''), m ? m[1] : '(undeclared)');
  }
  return out;
}

/**
 * The timestamp from which `bytes` means anything.
 *
 * The first version of the recorder read PostToolUse's output field as `tool_result`; the
 * runtime sends `tool_response`, so every result was written as zero bytes while looking
 * healthy (`scripts/guards/lib/evidence.mjs:375` — `INC-08`'s shape inside the subsystem
 * built to prevent it). Runs from before the fix read 0.00 MB no matter what they did, and
 * `test-engineer` is the specimen: 128 calls, zero bytes.
 *
 * Derived rather than hardcoded as a date, so it stays true if the corpus is pruned: the
 * earliest run that recorded a non-zero result byte count.
 */
export function byteSubstrateStart(rows) {
  const real = rows.filter((r) => r.bytes > 0 && r.ts).sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return real.length ? real[0].ts : null;
}

const mb = (n) => (n / 1048576).toFixed(2);
const min = (ms) => (ms / 60000).toFixed(1);

/**
 * The report. Deterministic by construction: rows are sorted by a total key rather than
 * left in directory-read order, so a second run over the same corpus is byte-identical —
 * the property both `progress/` extracts already hold, and the one that makes a number
 * auditable rather than anecdotal.
 *
 * The limits are printed in the header, not in a footnote. Without them these figures get
 * quoted as a token count within a week, which is `C-01`'s failure applied to the harness's
 * own numbers.
 */
export function formatReport(rows, opts = {}) {
  const { substrateStart = null, generatedFrom = 'evidence/runs', malformed = 0 } = opts;
  const L = [];

  // TASK 109: the header below is prose — a title, a description sentence, four caveat
  // bullets — exactly the distinction TASK 88 drew for renderLedger: D3 scopes mutation
  // away from a render template's SENTENCES, because emptying one proves nothing about
  // test quality, while its SHAPE (blank lines as block separators, the table headers and
  // `|---|` separator rows below) stays live and unsuppressed — nothing here hides those.
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('# What a run costs');
  L.push('');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push(`Generated from \`${generatedFrom}\` by \`scripts/guards/gate/check-cost.mjs\`. Read-only, reproducible: the same corpus produces this file byte-for-byte.`);
  L.push('');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('## What these numbers are, and what they are not');
  L.push('');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('- **`bytes` counts tool results only** — not the prompt, not the re-sent conversation history, not model output. It is a proxy for marginal context inflow and is **not tokens billed**. Do not quote it as a token count.');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('- **`model` prefers a measurement over a derivation** (`TASK 64` clause 6): when a dispatch\'s own `run.cost.by_model` exists and is non-empty, that is the model that actually ran. Only when it is absent does this fall back to the tier the role file declares, joined by the header\'s `agent` — a fallback that would miss a dispatch-time override. Each row\'s `model_source` (`measured` \\| `declared` \\| `unknown`) says which kind it is looking at.');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push(`- **\`footer: ABSENT\` means the run did not terminate normally — never that a budget stopped it** (\`G-06\`). A crash, a kill and a hook that never fired look identical from outside.`);
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('- **Network tools are under-counted, and `researcher` is the role this distorts.** `WebFetch` averages ~78 recorded bytes per result and `WebSearch` ~154 — the response wrapper, not the page the model actually read. A role whose work is fetching therefore reads as nearly free. Do not compute a delegation break-even for `researcher` from this column.');
  if (substrateStart) {
    // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
    L.push(`- **Byte counts are only meaningful from \`${substrateStart}\`.** Earlier runs recorded every result as 0 bytes (the \`tool_result\`/\`tool_response\` bug, \`evidence.mjs:375\`), so a role active only before that reads as free when it was not.`);
  }
  if (malformed > 0) {
    // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
    L.push(`- **${malformed} trace line(s) could not be parsed** and are excluded. A torn line narrows this report; it is never silently dropped.`);
  }
  L.push('');

  const sorted = [...rows].sort((a, b) =>
    String(a.ts).localeCompare(String(b.ts)) || String(a.agent).localeCompare(String(b.agent)) || String(a.runId).localeCompare(String(b.runId)));

  // Per role, which is the cut every decision in ADR-009 is made on.
  const byRole = new Map();
  for (const r of sorted) {
    const k = `${r.agent} ${r.model}`;
    const a = byRole.get(k) ?? { agent: r.agent, model: r.model, dispatches: 0, footers: 0, turns: 0, bytes: 0, durationMs: 0, denies: 0 };
    a.dispatches += 1;
    if (r.footer !== 'ABSENT') a.footers += 1;
    a.turns += r.turns;
    a.bytes += r.bytes;
    a.durationMs += r.durationMs;
    a.denies += r.denies;
    byRole.set(k, a);
  }

  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('## Per role');
  L.push('');
  L.push('| role | model (measured or declared — see limits above) | dispatches | finished | turns | result MB | wall-clock min | denies |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const a of [...byRole.values()].sort((x, y) => y.bytes - x.bytes || x.agent.localeCompare(y.agent))) {
    L.push(`| \`${a.agent || '(none)'}\` | ${a.model} | ${a.dispatches} | ${a.footers}/${a.dispatches} | ${a.turns} | ${mb(a.bytes)} | ${min(a.durationMs)} | ${a.denies} |`);
  }
  L.push('');

  // Per session, which is the unit the human experiences: one sitting, one bill.
  const bySession = new Map();
  for (const r of sorted) {
    // TASK 109: this loop used to also track `last` (the latest ts in the session), the
    // same way `first` is tracked below. Nothing ever read it — not this file, not
    // check-cost.mjs, not a test — so it was dead weight contributing untestable
    // survivors (mutating a computation nobody observes cannot be caught by any
    // assertion on the report's actual output). Deleted rather than tested or
    // suppressed: T-03's own reasoning for a suppression is "this is genuinely
    // equivalent", and dead code is neither equivalent nor covered, it is unused.
    const a = bySession.get(r.runId) ?? { runId: r.runId, first: r.ts, dispatches: 0, delegated: 0, roles: new Set(), turns: 0, bytes: 0, durationMs: 0, denies: 0 };
    a.dispatches += 1;
    if (r.reason === 'delegated') a.delegated += 1;
    if (r.agent) a.roles.add(r.agent);
    a.turns += r.turns;
    a.bytes += r.bytes;
    a.durationMs += r.durationMs;
    a.denies += r.denies;
    if (r.ts && (!a.first || r.ts < a.first)) a.first = r.ts;
    bySession.set(r.runId, a);
  }

  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('## Per session');
  L.push('');
  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('One session is one run directory. `delegated` counts the dispatches inside it, which is the number `ADR-009`\'s break-even rule is about.');
  L.push('');
  L.push('| session | started | dispatches | delegated | roles | turns | result MB | tool min | denies |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const a of [...bySession.values()].sort((x, y) => String(x.first).localeCompare(String(y.first)))) {
    L.push(`| \`${a.runId.slice(0, 8)}\` | ${a.first ?? '—'} | ${a.dispatches} | ${a.delegated} | ${a.roles.size} | ${a.turns} | ${mb(a.bytes)} | ${min(a.durationMs)} | ${a.denies} |`);
  }
  L.push('');

  // Stryker disable next-line StringLiteral: prose text, not structure — see the TASK 109 note above
  L.push('## Per dispatch');
  L.push('');
  L.push('| when | role | model | turns | result MB | min | denies | footer |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of sorted) {
    L.push(`| ${r.ts ?? '—'} | \`${r.agent || '(none)'}\` | ${r.model} | ${r.turns} | ${mb(r.bytes)} | ${min(r.durationMs)} | ${r.denies} | ${r.footer} |`);
  }
  L.push('');
  return L.join('\n');
}
