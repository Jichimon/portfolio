// The only thing that writes to evidence/ (H-03). Shared by pretooluse.mjs, which records
// its own verdict, and record-event.mjs, which records everything else.
//
// Two invariants it has to hold, and one rule it has to obey:
//
//   seq is dense       so a gap means truncation or a crashed hook, and is visible.
//   redaction is here  so nothing reaches disk unscrubbed, whatever the caller passes.
//   a hook never breaks the session  — every failure path exits quietly. A trace that stops
//                      recording is a lost measurement; a trace that blocks the agent is a
//                      broken tool, and the second is much worse than the first.

import { readFileSync, appendFileSync, mkdirSync, rmdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runIdFor, nextSeq, rejectReason, posturePatch } from '../lib/evidence.mjs';
import { parseTerms } from '../lib/terms.mjs';

const slug = (s) => String(s ?? 'unknown').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);

/** Sync sleep. Hooks are short-lived processes; there is no event loop to yield to. */
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * mkdir is atomic on every platform this runs on, which makes it the cheapest correct lock.
 * Without it two concurrent hooks read the same seq and write it twice — and a duplicate seq
 * would falsify the monotonicity the architecture claims, so the claim gets the lock.
 */
function withLock(dir, fn) {
  const lock = join(dir, '.lock');
  for (let i = 0; i < 100; i++) {
    try {
      mkdirSync(lock);
      try { return fn(); } finally { try { rmdirSync(lock); } catch { /* already gone */ } }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // A lock older than five seconds belonged to a process that died holding it.
      try {
        if (Date.now() - statSync(lock).mtimeMs > 5000) { rmdirSync(lock); continue; }
      } catch { /* it vanished; retry */ }
      sleep(2);
    }
  }
  return fn(); // Contended past the budget: write anyway. A duplicate seq is visible; silence is not.
}

// Keyed by root, not a single module-level value. Each hook invocation is a fresh process
// with exactly one root, so this has never bitten in production — but a single unkeyed
// cache made every case below untestable in one file: a second call with a DIFFERENT root
// would silently return the first root's terms (allow or throw) instead of its own.
const cachedTermsByRoot = new Map();

/**
 * The write-time half of C-05/H-04's scrubbing. Unlike check-terms.mjs — a gate step a
 * human runs, so refusing costs one red step — this runs on every tool call, so refusing
 * unconditionally would deny every call on a checkout without private/ (which is normal:
 * private/ is gitignored and never committed) and brick the harness entirely.
 *
 * So the discriminator is whether private/ itself exists, not whether the term list does:
 *
 *   private/ absent               -> nothing here to protect. [] is correct, no complaint.
 *   private/ present, list missing,
 *   empty, or unparseable          -> the thing being protected exists and the protection
 *                                     does not. FAIL CLOSED (G-13): throw, naming which case,
 *                                     so a caller (pretooluse.mjs) can turn it into a denial
 *                                     instead of silently redacting nothing.
 */
export function loadTerms(root) {
  if (cachedTermsByRoot.has(root)) return cachedTermsByRoot.get(root);

  const privateDir = join(root, 'private');
  if (!existsSync(privateDir)) {
    const terms = [];
    cachedTermsByRoot.set(root, terms);
    return terms;
  }

  const p = join(privateDir, 'banned-terms.txt');
  if (!existsSync(p)) {
    throw new Error(
      'private/banned-terms.txt is missing, but private/ exists — refusing to protect ' +
      'nothing. A confidentiality check that cannot read its own term list must never scrub silently.',
    );
  }

  // parseTerms itself throws on a malformed \b-flagged line (TASK 45); that propagates here
  // unchanged, which is the point — this call must not swallow it into a silent [].
  const terms = parseTerms(readFileSync(p, 'utf8'));
  if (terms.length === 0) {
    throw new Error(
      'private/banned-terms.txt defines no terms, but private/ exists — an empty list makes ' +
      'every scrub a no-op, which is worse than no list at all.',
    );
  }

  cachedTermsByRoot.set(root, terms);
  return terms;
}

/** Keep the newest N run directories. Operational output, not knowledge — see guards.config. */
function prune(runsDir, keep) {
  try {
    const dirs = readdirSync(runsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, at: statSync(join(runsDir, d.name)).mtimeMs }))
      .sort((a, b) => b.at - a.at);
    for (const d of dirs.slice(keep)) rmSync(join(runsDir, d.name), { recursive: true, force: true });
  } catch { /* retention is housekeeping; never let it break a run */ }
}

/**
 * Append events for one hook invocation. Callers pass event bodies without `seq`, `ts`,
 * `run_id` or `agent` — those are stamped here so they cannot be got wrong per call site.
 *
 * @returns {boolean} whether the write happened, for the caller's own diagnostics only.
 */
export function record(root, input, events, opts = {}) {
  if (!events.length) return false;
  try {
    const { run_id, parent_run_id, agent } = runIdFor(input);
    const runsDir = join(root, 'evidence/runs');
    const dir = join(runsDir, slug(input.session_id));
    mkdirSync(dir, { recursive: true });

    const file = join(dir, `${input.agent_id ? `${slug(agent)}-${slug(input.agent_id)}` : 'orchestrator'}.jsonl`);

    // A malformed payload must not reach a file nobody may clean (H-03). The rejection is
    // itself recorded, so the failure is visible rather than silent.
    const checked = events.map((e) => {
      const why = rejectReason(e);
      return why ? { ev: 'trace.rejected', rejected_ev: e.ev, reason: why } : e;
    });

    withLock(dir, () => {
      const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
      let seq = nextSeq(text);
      const ts = new Date().toISOString();

      // TASK 12 slice 5: G-04's compensation for a residual risk only works if permission_mode
      // is ever actually recorded. SessionStart/SubagentStart genuinely omit it; PostToolUse
      // and PostToolUseFailure carry the real value. When it is real, new, and not immediately
      // after another header, stamp a fresh run.header so the true posture becomes visible
      // instead of staying "unknown" forever. Skipped outright when the caller's own events
      // already begin with a run.header — belt and braces on top of posturePatch's own
      // adjacency check, using the SAME text already read above rather than a second read.
      const observed = events[0]?.ev === 'run.header' ? null : posturePatch(text, input.permission_mode);
      const toWrite = observed ? [observed, ...checked] : checked;

      const lines = toWrite.map((e) => JSON.stringify({
        ev: e.ev, ts, seq: seq++, run_id, ...(parent_run_id ? { parent_run_id } : {}), agent,
        ...Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'ev')),
      }));
      appendFileSync(file, lines.join('\n') + '\n');
    });

    if (opts.prune) prune(runsDir, opts.prune);
    return true;
  } catch (err) {
    // Visible in the transcript, fatal to nothing.
    console.error(`[trace] not recorded: ${err.code ?? err.name ?? 'error'}`);
    return false;
  }
}
