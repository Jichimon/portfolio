// Layer 06 · the observable substrate. Three correlated events per tool call:
//
//   tool.requested  →  policy.decision  →  tool.result
//   (PreToolUse)       (guard or engine)   (PostToolUse | PostToolUseFailure)
//
// `executed` is DERIVED from the absence of a result, never stored. That is what separates
// *the agent tried something dangerous and was stopped* from *something dangerous happened* —
// opposite outcomes, one of which is the harness working, and a flat log of tool calls cannot
// tell them apart.
//
// Two write-time properties, both real rather than aspirational:
//
//   seq        a monotonic counter per run. A gap means truncation or a crashed hook, so the
//              trace is GAP-EVIDENT. It is not tamper-proof and does not claim to be (A11).
//   redaction  paths, byte lengths and content hashes — never file contents. Every string is
//              scrubbed against private/banned-terms.txt BEFORE it is written. Not optional:
//              a trace of a session that touched private/ would recreate the exact leak this
//              repository exists to prevent (C-05, H-04).

import { createHash } from 'node:crypto';
import { mask, scanText } from './terms.mjs';

/** Short content hash: enough to tell two versions apart, useless for recovering content. */
const hash = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
/**
 * A byte length that measures the value, not `String()`'s idea of it. A string is measured
 * directly, as before; null/undefined are 0, as before. Anything else — the shape the runtime
 * actually sends for `tool_response` — is serialized first, because `String(obj)` collapses
 * every object to the constant `"[object Object]"` (15 bytes, always), which is INC-08's shape:
 * a number that looks like a measurement and measures nothing.
 *
 * This runs inside a hook, so it must never throw. `JSON.stringify` returns `undefined` for a
 * function or a symbol, and it throws outright on a circular structure — both are caught and
 * fall back to `String(s)`, which is exactly today's (honest, if blunt) behavior.
 */
const bytes = (s) => {
  if (s === null || s === undefined) return 0;
  if (typeof s === 'string') return Buffer.byteLength(s, 'utf8');
  try {
    const serialized = JSON.stringify(s);
    if (serialized === undefined) return Buffer.byteLength(String(s), 'utf8');
    return Buffer.byteLength(serialized, 'utf8');
  } catch {
    return Buffer.byteLength(String(s), 'utf8');
  }
};

/**
 * Who is running. The orchestrator run IS the session; a delegated run hangs off it, so a
 * subagent's events stay correlated to the run that spawned them without any coordination
 * between processes.
 */
export function runIdFor(input) {
  const session = input.session_id ?? 'unknown-session';
  if (!input.agent_id) return { run_id: session, parent_run_id: null, agent: 'orchestrator' };
  const agentType = input.agent_type;
  const agent = agentType && String(agentType).trim() ? agentType : 'unknown-role';
  return { run_id: `${session}:${input.agent_id}`, parent_run_id: session, agent };
}

const scrub = (s, terms) => mask(String(s ?? ''), terms);

/**
 * A tool call reduced to what an evaluator needs and a leak cannot use.
 *
 * The default branch records KEYS ONLY. A tool the runtime ships next month is unknown here,
 * and passing an unknown input through would make the trace leak on the first such tool —
 * so unknown fails closed, exactly as the delegation gate treats an unknown tool name (P-16).
 */
export function redactToolInput(tool, input = {}, terms = []) {
  const path = (p) => scrub(p ?? '', terms);

  switch (tool) {
    case 'Write':
      return { file_path: path(input.file_path), bytes: bytes(input.content), sha256: hash(input.content ?? '') };
    case 'NotebookEdit':
      return { file_path: path(input.notebook_path ?? input.file_path), bytes: bytes(input.new_source), sha256: hash(input.new_source ?? '') };
    case 'Edit':
      return {
        file_path: path(input.file_path),
        bytes: bytes(input.new_string),
        sha256: hash(input.new_string ?? ''),
        replaced_sha256: hash(input.old_string ?? ''),
      };
    case 'Read':
      return { file_path: path(input.file_path) };
    case 'Bash':
    case 'PowerShell':
      return { command: scrub(input.command, terms) };
    case 'Grep':
    case 'Glob':
      return { pattern: scrub(input.pattern, terms), path: path(input.path) };
    case 'Agent':
      return {
        subagent_type: scrub(input.subagent_type, terms),
        bytes: bytes(input.prompt),
        sha256: hash(input.prompt ?? ''),
      };
    case 'WebFetch':
      return { url: scrub(input.url, terms) };
    default:
      return { keys: Object.keys(input) };
  }
}

const ERROR_CLASSES = [
  [/ENOENT|no such file/i, 'not_found'],
  [/EACCES|EPERM|permission denied/i, 'permission_denied'],
  [/timed? ?out/i, 'timeout'],
  [/exit code|exited with|non-?zero/i, 'nonzero_exit'],
  [/EEXIST|already exists/i, 'already_exists'],
  [/ENOSPC|no space/i, 'disk_full'],
];

/** A class, never a message: the message is arbitrary text from an arbitrary tool. */
export function classifyError(message) {
  for (const [re, cls] of ERROR_CLASSES) if (re.test(String(message ?? ''))) return cls;
  return 'unknown';
}

/** One event. `ts` is set here so every event carries one, from one place. */
export function buildEvent(ev, base, fields = {}) {
  return { ev, ts: new Date().toISOString(), ...base, ...fields };
}

/** Continue from the highest seq already written, ignoring a truncated final line. */
export function nextSeq(existing) {
  let max = 0;
  for (const line of String(existing).split('\n')) {
    const m = line.match(/"seq"\s*:\s*(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// --- validation -------------------------------------------------------------

/** Required fields per event type. The schema, as data, so the check derives from it (P-13). */
export const SCHEMA = {
  'run.header': ['run_id', 'permission_mode'],
  'run.footer': ['run_id', 'termination'],
  'tool.requested': ['run_id', 'tool', 'tool_use_id', 'target'],
  'policy.decision': ['run_id', 'tool_use_id', 'decision', 'source'],
  'tool.result': ['run_id', 'tool_use_id', 'ok'],
  'instructions.loaded': ['run_id', 'file_path', 'load_reason'],
  'trace.rejected': ['run_id', 'rejected_ev', 'reason'],
};

/**
 * Validate one event BEFORE it is written. Returns null when it conforms, or a reason.
 *
 * The trace is append-only and `H-03` denies every agent vector into it, so a malformed event
 * is permanent: it fails check-trace forever and the only party who can clean it up is the
 * human. Refusing to write it — and recording the refusal as `trace.rejected` instead — keeps
 * the malformation visible without poisoning the file. A silent drop would be worse than
 * either, since it is INC-08 again: the recorder that quietly stops recording.
 */
export function rejectReason(event) {
  if (!(event.ev in SCHEMA)) return `unknown event type "${event.ev}"`;
  const missing = SCHEMA[event.ev].filter((f) => f !== 'run_id' && event[f] === undefined);
  return missing.length ? `missing required field(s): ${missing.join(', ')}` : null;
}

/**
 * Schema conformance, seq continuity and redaction — step 7's acceptance check.
 *
 * Findings never quote the offending value. A validator that printed the banned term it
 * found would be the leak it is checking for.
 *
 * `opts.opaqueFields` names fields whose VALUES are opaque, API-generated tokens
 * (`tool_use_id`, `run_id`, `parent_run_id`) and are blanked before the redaction match, by
 * field name only — never by a "looks like an id" heuristic that would widen itself over
 * time (TASK 18, INC-15's family). Every other field, including one nobody has thought of
 * yet, and a line that fails to parse, is still scanned exactly as before.
 *
 * `opts.traceHeaderReasons` (TASK 12 slice 4) is the declared vocabulary a `run.header`'s
 * `reason` must come from. Threaded the same way as `opaqueFields` — same options argument,
 * no reordering. An absent or empty list fails CLOSED: every present `reason` is then
 * unverifiable and reported, rather than the check quietly validating against nothing
 * forever (G-13's reasoning applied here).
 */
export function validateTrace(text, terms = [], label = '', opts = {}) {
  const { opaqueFields = [], traceHeaderReasons = [] } = opts;
  const findings = [];
  const at = label ? `${label} ` : '';
  const raw = String(text).split('\n').filter((l) => l.trim());

  if (raw.length === 0) return [{ message: `${at}trace is empty — a run that recorded nothing proves nothing` }];

  const events = [];
  raw.forEach((line, i) => {
    try {
      events.push(JSON.parse(line));
    } catch {
      findings.push({ message: `${at}line ${i + 1}: parse error — the trace is not valid JSONL` });
    }
  });

  let expected = null;
  const requests = new Map();
  let prevEv = null;

  for (const e of events) {
    const where = `${at}seq ${e.seq}`;

    if (!(e.ev in SCHEMA)) {
      findings.push({ message: `${where}: unknown event type "${e.ev}" — the schema is the contract, so an event outside it is either a bug or an undocumented change` });
      prevEv = e.ev;
      continue;
    }
    for (const field of SCHEMA[e.ev]) {
      if (e[field] === undefined) findings.push({ message: `${where}: ${e.ev} is missing required field "${field}"` });
    }
    if (!e.ts) findings.push({ message: `${where}: no timestamp` });

    // A run.header immediately following another run.header describes one start recorded
    // twice, never a resume — a real resume has real events (at minimum a run.footer, or
    // any tool activity) between the two headers (TASK 12 slice 4, decided from the corpus
    // evidence in the brief: no header is ever legitimately adjacent to another).
    if (e.ev === 'run.header' && prevEv === 'run.header') {
      findings.push({ message: `${where}: run.header immediately follows another run.header — one start recorded twice, not a resume` });
    }

    // A header's reason must come from the declared vocabulary. Fail closed: an empty or
    // missing traceHeaderReasons means nothing is declared, so every present reason is
    // unverifiable and reported — never silently accepted as if anything were valid.
    if (e.ev === 'run.header' && e.reason !== undefined && !traceHeaderReasons.includes(e.reason)) {
      findings.push({ message: `${where}: run.header reason "${e.reason}" is outside the declared vocabulary — either an undeclared value, or guards.config.json's traceHeaderReasons is missing or empty` });
    }

    prevEv = e.ev;

    // seq must be dense and strictly increasing. A gap means truncation or a crashed hook;
    // a duplicate means two writers raced. Both are visible, which is the claim.
    if (expected !== null && e.seq !== expected) {
      findings.push({ message: `${where}: expected seq ${expected} — ${e.seq < expected ? 'duplicate or out of order' : 'gap'}, meaning events were lost, truncated or written concurrently` });
    }
    expected = e.seq + 1;

    if (e.ev === 'tool.requested') {
      // Correlation is the trace's whole claim: a request, its decision, its result. A
      // reused id would silently join the wrong events, and nothing else would say so.
      // Scoped to tool.requested — a policy.decision and a tool.result legitimately repeat
      // the id of the request they belong to, and flagging those fires on every well-formed file.
      // The id itself is NEVER quoted. INC-15 exists because a banned term turned up inside
      // one by chance, so printing it here would be the leak this function checks for — the
      // earlier event's seq locates it just as well and carries nothing.
      if (requests.has(e.tool_use_id)) {
        findings.push({ message: `${where}: this tool_use_id was already used by the tool.requested at seq ${requests.get(e.tool_use_id)} — correlation would silently join the wrong events` });
      }
      requests.set(e.tool_use_id, e.seq);
    }
    if ((e.ev === 'policy.decision' || e.ev === 'tool.result') && !requests.has(e.tool_use_id)) {
      // An orphan tool.result is a DELIVERY LOSS, not a writer defect (TASK 12 slice 3): the
      // runtime never delivered the PreToolUse write, an environment property check-trace
      // measures and floors rather than a schema violation this validator could ever call
      // fixed. H-03 means no agent may ever clear it by editing the trace, so it must be
      // distinguishable from every other finding here, which fails unconditionally. Scoped to
      // tool.result only — that is the shape every orphan on disk actually took; an orphan
      // policy.decision stays an ordinary, unconditional finding.
      const finding = { message: `${where}: ${e.ev} has no matching tool.requested — correlation is broken, so the phase cannot be derived` };
      if (e.ev === 'tool.result') finding.kind = 'delivery_loss';
      findings.push(finding);
    }
    if (e.ev === 'policy.decision' && e.decision === 'deny') {
      for (const f of ['rule', 'guard']) {
        if (!e[f]) findings.push({ message: `${where}: a deny decision with no "${f}" — a denial nobody can attribute is not evidence` });
      }
    }
  }

  // Redaction is asserted over the WHOLE file, not per field: the point is that no banned
  // term reaches the trace by any route, including one nobody wrote a redactor for. Reused
  // from terms.mjs rather than hand-rolled, so this honours each term's own `\b` word-boundary
  // flag (TASK 45) instead of always matching as a bare substring, and so opaque, generated
  // ids (tool_use_id, run_id, parent_run_id) are blanked before matching by field name only —
  // never by shape, and never for a field outside that closed list (TASK 18).
  const serialized = raw.join('\n');
  for (const hit of scanText(serialized, terms, { opaqueFields })) {
    findings.push({ message: `${at}redaction failed: banned-terms.txt:${hit.term.line} appears in the trace at line ${hit.line}. The trace is written by hooks and kept on disk, so this is a leak, not a warning` });
  }

  return findings;
}

/**
 * The wiring half of the check. A validator that only reads trace files would pass forever on
 * a repository whose hooks were never registered — INC-08's exact shape, and the reason the
 * gate asserts the registration as well as the contents.
 */
export function validateWiring(settings, recordedHookEvents, hookPath) {
  const findings = [];
  const hooks = settings.hooks ?? {};
  for (const ev of recordedHookEvents) {
    const entries = hooks[ev] ?? [];
    const commands = entries.flatMap((h) => (h.hooks ?? []).map((x) => x.command ?? ''));
    if (commands.length === 0) {
      findings.push({ message: `${ev} is not registered — the events it would record are never written, and nothing else would say so` });
    } else if (!commands.some((c) => c.includes(hookPath))) {
      findings.push({ message: `${ev} is registered but does not invoke ${hookPath}` });
    } else if (!entries.some((h) => ['*', '', undefined].includes(h.matcher))) {
      findings.push({ message: `${ev} is filtered by a matcher — the trace would record a subset of reality and read as complete` });
    }
  }
  return findings;
}

/**
 * The vocabulary the writer can emit must be exactly the one declared in config. Divergence
 * either way is a silent failure: an undeclared event validates as unknown forever, and a
 * declared event nobody emits is a measurement someone thinks they have.
 */
export function validateVocabulary(declared) {
  const known = Object.keys(SCHEMA);
  const findings = [];
  for (const e of known.filter((e) => !declared.includes(e))) {
    findings.push({ message: `the writer can emit "${e}" but guards.config.json does not declare it` });
  }
  for (const e of declared.filter((e) => !known.includes(e))) {
    findings.push({ message: `guards.config.json declares "${e}" but no schema defines it, so nothing validates it` });
  }
  return findings;
}

/**
 * TASK 12 slice 5 — the fix for `G-04`'s unkept promise. Every `run.header` written from
 * `SessionStart`/`SubagentStart` records `permission_mode: 'unknown'`, because those two hook
 * payloads genuinely omit the field. `PostToolUse` and `PostToolUseFailure` DO carry the real
 * value (captured from the running tool, not documentation — see `POST_TOOL_USE_KEYS` in
 * evidence.test.mjs). This is the bridge: given the text of a run's trace file already on
 * disk and a candidate mode from whichever hook just fired, decide whether a fresh
 * `run.header` should be recorded so the real posture becomes visible — including a
 * mid-session switch to `bypassPermissions`, which `G-04` exists to catch.
 *
 * Pure and read-only: never touches the filesystem itself, so `record` can hand it the text
 * it already read for `nextSeq` instead of reading the file twice.
 *
 * Returns a `run.header` event (missing only the fields the writer stamps — `seq`, `ts`,
 * `run_id`, `agent`) when, and only when, ALL of:
 *   - `permissionMode` is a real, non-empty string and not the literal `'unknown'` —
 *     recording `unknown` twice is not an improvement.
 *   - it differs from the most recent `permission_mode` already recorded by a `run.header`
 *     in `existingText`. No prior header at all (including an empty/new file) counts as a
 *     difference: the real mode is new information worth capturing immediately, and there is
 *     no prior header for it to be adjacent to.
 *   - the LAST event currently in `existingText` is not itself a `run.header`. Load-bearing:
 *     `record` is called by `pretooluse.mjs` on the very first tool call of a run, which
 *     lands immediately after the startup header. Without this guard the writer would emit a
 *     finding against itself — two adjacent headers, which slice 4 made a finding — on every
 *     future trace.
 */
export function posturePatch(existingText, permissionMode) {
  if (typeof permissionMode !== 'string' || permissionMode === '' || permissionMode === 'unknown') return null;

  const lines = String(existingText ?? '').split('\n').filter((l) => l.trim());

  let last = null;
  let lastHeaderMode; // undefined when no run.header has been recorded yet in this text
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; } // an unparsable line carries no posture
    last = e;
    if (e.ev === 'run.header') lastHeaderMode = e.permission_mode;
  }

  if (last && last.ev === 'run.header') return null; // never follow a header with another
  if (lastHeaderMode === permissionMode) return null; // no change to report

  return { ev: 'run.header', permission_mode: permissionMode, reason: 'observed' };
}

/**
 * Hook payload → trace events. Pure, and here rather than in the hook script for one reason:
 * the field names below are a COUPLING to the runtime, and a coupling nobody tests drifts.
 *
 * They were captured from real payloads, not read from documentation. The documentation
 * summarizes the PostToolUse output field as `tool_result`; the runtime sends `tool_response`,
 * and the first version of this recorded every result as zero bytes while looking healthy —
 * INC-08's shape inside the subsystem built to prevent it (P-04).
 */
export function eventsFor(input, terms = [], opts = {}) {
  const posture = {
    permission_mode: input.permission_mode ?? 'unknown',
    enforcement_environment: opts.enforcementEnvironment ?? 'policy-controlled',
    model: input.model ?? null,
    cwd: input.cwd ?? null,
  };

  switch (input.hook_event_name) {
    case 'SessionStart':
      return [{ ev: 'run.header', ...posture, reason: input.session_start_reason ?? 'startup' }];

    case 'SubagentStart':
      // A delegated run gets its own header, so its posture is readable on its own terms
      // rather than inherited by assumption from the parent.
      return [{ ev: 'run.header', ...posture, reason: 'delegated', isolation: input.isolation ?? 'none' }];

    case 'SessionEnd':
      return [{ ev: 'run.footer', termination: { state: 'COMPLETE', reason: input.session_end_reason ?? 'other' } }];

    case 'SubagentStop':
      return [{ ev: 'run.footer', termination: { state: 'COMPLETE', reason: 'objective_reported' } }];

    case 'PostToolUse':
      return [{
        ev: 'tool.result', tool_use_id: input.tool_use_id, tool: input.tool_name,
        ok: true, bytes: bytes(input.tool_response), duration_ms: input.duration_ms ?? null,
      }];

    case 'PostToolUseFailure':
      return [{
        ev: 'tool.result', tool_use_id: input.tool_use_id, tool: input.tool_name,
        ok: false, error_class: input.is_interrupt ? 'interrupted' : classifyError(input.error),
        duration_ms: input.duration_ms ?? null,
      }];

    case 'PermissionDenied':
      // The other half of the policy layer. The PreToolUse guard records its own verdicts;
      // these are the ones the permission engine reached, which run AFTER the hook and would
      // otherwise be invisible — including every deny rule in settings.json.
      return [{
        ev: 'policy.decision', tool_use_id: input.tool_use_id, decision: 'deny', source: 'permission',
        rule: 'settings.deny', guard: 'permission-engine',
        target: redactToolInput(input.tool_name, input.tool_input, terms),
      }];

    case 'InstructionsLoaded':
      // P-08's evidence. "The agent read the rules" stops being a hope and becomes a record
      // of which file loaded, when and why — the one bootstrap claim that was self-reported.
      return [{ ev: 'instructions.loaded', file_path: input.file_path, load_reason: input.load_reason }];

    default:
      return [];
  }
}
