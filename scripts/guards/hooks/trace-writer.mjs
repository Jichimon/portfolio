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
import { runIdFor, nextSeq, rejectReason } from '../lib/evidence.mjs';
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

let cachedTerms = null;
export function loadTerms(root) {
  if (cachedTerms) return cachedTerms;
  const p = join(root, 'private/banned-terms.txt');
  cachedTerms = existsSync(p) ? parseTerms(readFileSync(p, 'utf8')) : [];
  return cachedTerms;
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
      let seq = nextSeq(existsSync(file) ? readFileSync(file, 'utf8') : '');
      const ts = new Date().toISOString();
      const lines = checked.map((e) => JSON.stringify({
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
