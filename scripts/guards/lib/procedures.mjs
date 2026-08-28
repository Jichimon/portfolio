// Step 9's acceptance check: the router resolves, and a `done` block cannot claim success
// with nothing behind it.
//
// Two failures, both of which have already happened in this repository's lineage:
//
//   the router names a procedure nobody wrote   — the rules instruct you to run something
//     that is not there, so the instruction quietly means nothing. INC-08 in the process
//     layer, and the reason a roster of "known procedures" is exactly the wrong shape here.
//
//   a done-dimension reads `passed` with no evidence   — INC-01's residue. "Done" meant four
//     different things because nothing forced each dimension to say which artifact backed it.
//     This is the mechanized half of P-03 and A22, and it is what closes the Evidence
//     Contract's outstanding gap.

/**
 * Procedure names from the router's ACTION column, in the router SECTION only.
 *
 * Both narrowings were earned by a failure. Scanning the whole file swept the P-* rules
 * table, whose rule column is full of backticked words — `version`, `status` — so the guard
 * demanded skills by those names. Scanning both columns of the router would sweep the
 * work-item TYPES in the situation column and demand a skill called `feature`.
 *
 * A guard that invents requirements gets deleted, so it is scoped twice.
 */
export function parseRouter(rulesText) {
  const section = rulesText.split(/^##\s+/m).find((s) => /^The router/i.test(s));
  if (!section) return [];
  const names = new Set();
  for (const line of section.split(/\r?\n/)) {
    if (!/^\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1);
    if (cells.length < 2) continue;
    const action = cells[1];
    // The situation column carries work-item TYPES in backticks — `feature`, `content`.
    // Sweeping both columns would demand a skill named `feature` and get the guard deleted.
    for (const m of action.matchAll(/`([a-z][a-z0-9-]+)`/g)) names.add(m[1]);
  }
  return [...names];
}

/** @param {(name:string)=>boolean} skillExists */
export function validateRouter(names, skillExists) {
  if (names.length === 0) {
    return [{ message: 'the router names no procedure — either the table moved or the parser no longer matches it, and in both cases nothing is being checked' }];
  }
  return names
    .filter((n) => !skillExists(n))
    .map((n) => ({ message: `the router routes to \`${n}\`, but .claude/skills/${n}/SKILL.md does not exist — the rules instruct a procedure nobody wrote` }));
}

/** A progress log's date, from its filename. Null when the file is not a dated log. */
export function logDate(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return m ? m[1] : null;
}

/**
 * A generated artifact declares itself in its own body, not by filename (P-13). Both
 * signals the harness already writes for a precomputed D2 corpus (TASK 55, TASK 60) must
 * be present together — either alone (a stray code fence, an incidental "D2" mention)
 * proves nothing.
 */
export function isGeneratedArtifact(text) {
  const declaresToolOutput = /tool output \(`D2`\)/.test(text);
  const hasReproduceCommand = /\*\*Reproduce this file\*\*[^\n]*\n+```[\s\S]*?```/.test(text);
  return declaresToolOutput && hasReproduceCommand;
}

/**
 * Whether a progress/ file with no `done:` block is an omission, once the convention date
 * and the generated-artifact exemption are both applied. Null = no finding.
 */
export function missingDoneBlockFinding(text, date, since) {
  if (!date || date < since) return null;
  if (isGeneratedArtifact(text)) return null;
  return `carries no \`done\` block. The convention has existed since ${since}, and a log without one records that work happened, not that it finished (P-03)`;
}

export const DONE_STATUSES = ['passed', 'failed', 'blocked', 'partial', 'not_applicable'];

/**
 * The `done:` block out of a fenced yaml section. Returns null when there is none, which is
 * a different fact from an empty one and is treated differently by the caller.
 */
export function parseDoneBlock(text) {
  const fence = text.match(/```ya?ml\r?\n([\s\S]*?)```/g);
  if (!fence) return null;
  const block = fence.map((f) => f.replace(/```ya?ml\r?\n|```/g, '')).find((b) => /^done:/m.test(b));
  if (!block) return null;

  const out = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^\s{2,}([a-z_]+):\s*\{(.*)\}\s*,?\s*$/);
    if (!m) continue;
    const [, name, body] = m;
    const status = body.match(/status:\s*([a-z_]+)/)?.[1] ?? '';
    const evidenceRaw = body.match(/evidence:\s*\[(.*?)\]/)?.[1];
    const reason = body.match(/reason:\s*(?:"([^"]*)"|'([^']*)'|([^,}]+))/);
    out[name] = {
      status,
      evidence: evidenceRaw === undefined ? null
        : evidenceRaw.split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean),
      reason: (reason?.[1] ?? reason?.[2] ?? reason?.[3] ?? '').trim(),
    };
  }
  return out;
}

/**
 * The rule that makes a done block worth writing.
 *
 * `passed` is the only status that requires evidence, because it is the only one that makes a
 * positive claim. `not_applicable` requires a reason instead — declaring a dimension out loud
 * is the point, and silence reads as coverage (P-03). `blocked` and `failed` are legitimate
 * outcomes and need either.
 *
 * Not mechanized, and said so rather than implied: whether an evidence entry is a POINTER or
 * a sentence. "gate-run exit:0" and "we ran the gate and it was fine" are both non-empty, and
 * only a reader can tell them apart. That half stays review-time.
 */
export function validateDone(block, label = '') {
  const at = label ? `${label}: ` : '';
  const findings = [];
  const names = Object.keys(block ?? {});

  if (names.length === 0) {
    return [{ message: `${at}the done block declares no dimension — an empty conjunction is true of everything` }];
  }

  for (const name of names) {
    const d = block[name];

    if (!DONE_STATUSES.includes(d.status)) {
      findings.push({ message: `${at}\`${name}\` has status "${d.status || '(none)'}", which is outside the vocabulary (${DONE_STATUSES.join(' | ')})` });
      continue;
    }

    if (d.status === 'passed' && !(d.evidence?.length)) {
      findings.push({ message: `${at}\`${name}\` reads \`passed\` with no evidence. A dimension that claims success and points at nothing is a claim, not a result (P-03, P-11)` });
    }

    if (d.status === 'not_applicable' && !d.reason) {
      findings.push({ message: `${at}\`${name}\` reads \`not_applicable\` with no reason. An inapplicable dimension is declared out loud, because silence reads as coverage (P-03)` });
    }

    if ((d.status === 'blocked' || d.status === 'failed' || d.status === 'partial')
        && !(d.evidence?.length) && !d.reason) {
      findings.push({ message: `${at}\`${name}\` reads \`${d.status}\` with neither evidence nor a reason — the outcome is legitimate, saying nothing about it is not` });
    }
  }

  return findings;
}

/**
 * K1-001: a done block dated on/after the iterations convention's cutoff must carry an
 * `iterations` dimension. Same mechanism as `doneBlockRequiredFrom` — a dated threshold with a
 * written reason, so a NEW log cannot slip through it, and a log predating the cutoff is not
 * retroactively demanded to carry a dimension nobody told it to when it was written.
 *
 * K1 (implement→verify cycles) is otherwise unmeasurable: SPEC-TASK-13 exists because no
 * procedure step captured it even when a work item did run through the harness.
 */
export function validateIterationsRequired(block, date, since, label = '') {
  const at = label ? `${label}: ` : '';
  if (!date || date < since) return [];
  if (!block || !('iterations' in block)) {
    return [{ message: `${at}the done block carries no \`iterations\` dimension. The convention has existed since ${since}, and a completed work log without one leaves K1 unmeasurable (SPEC-TASK-13)` }];
  }
  return [];
}

/**
 * K1-002: when `iterations` reads `passed`, `evidence[0]` must be a bare non-negative integer
 * (`^\d+$`) — not a sentence — because a future evaluator (EVAL-001) reads it without
 * interpreting prose. `not_applicable` with a reason stays legitimate via `validateDone`, and
 * absent evidence is `validateDone`'s finding, not this one — this only narrows the SHAPE of
 * `iterations`'s own evidence once it exists.
 */
export function validateIterationsEvidence(block, label = '') {
  const at = label ? `${label}: ` : '';
  const d = block?.iterations;
  if (!d || d.status !== 'passed' || !(d.evidence?.length)) return [];
  const first = d.evidence[0];
  if (!/^\d+$/.test(first)) {
    return [{ message: `${at}\`iterations\` reads \`passed\` with evidence[0] = "${first}", which is not a shape a future evaluator can read without interpreting prose — it must be a bare integer (e.g. "2")` }];
  }
  return [];
}

/**
 * ---------------------------------------------------------------------------
 * Iteration attribution (TASK 72)
 * ---------------------------------------------------------------------------
 *
 * `K1` reports that an item took nine passes. It does not say whether those passes were the
 * author rejecting an artifact, a slice coming back for rework, or the gate sending the code
 * back — and every proposal about slice seams is a guess until it does.
 *
 * One field carries the answer: `iteration_split`, whose evidence is `bucket=count` pairs
 * summing to `iterations`. The counts stay human-written, exactly as `SPEC-TASK-13` decided
 * for `iterations` itself — an iteration is a human-visible implement→verify cycle, and a
 * tool-call count would move for reasons unrelated to what K1 measures.
 *
 * **The vocabulary is derived from two live artifacts and never written here** (`P-13`). A
 * hardcoded bucket list is the shape `INC-07` fired on: it passes forever, silently, while
 * the thing it claims to check has moved.
 */

/** The heading's first word, which is what makes `Slice and delegate` a stable `slice`. */
const slugOf = (heading) => heading.trim().split(/[\s,—-]+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The steps of the `work-item` procedure an iteration can return TO, read from its own
 * `## N · Name` headings.
 *
 * The first step is dropped because nothing returns to the entry point, and the last because
 * a return to Close means the item was not done — which is `K2`, a different metric with a
 * different substrate (`TASKS.md` status transitions, `TASK 66`).
 *
 * Throws rather than returning nothing (`G-13`): an empty vocabulary accepts every bucket
 * name, so the check would report PASS while asserting nothing at all.
 */
export function procedureReturnPoints(skillText) {
  const steps = [...String(skillText).matchAll(/^##\s+(\d+)\s+·\s+(.+?)\s*$/gm)]
    .map((m) => ({ n: Number(m[1]), heading: m[2] }))
    .sort((a, b) => a.n - b.n);
  const inner = steps.slice(1, -1);
  if (inner.length === 0) {
    throw new Error('the work-item procedure yields no return point — its "## N · Name" headings no longer parse, so the iteration vocabulary would be empty and every bucket name would be accepted (G-13)');
  }
  return inner.map((s) => ({ slug: slugOf(s.heading), heading: s.heading }));
}

/**
 * The register's own type table, as `type -> produces a spec`.
 *
 * Anchored on the header row rather than on position: first cell `type`, second cell
 * mentioning a spec. One row can declare several types (`` `feature` · `migration` ``), so
 * every code span in the first cell is collected — item seven gets read, not waved through.
 */
function parseTypeTable(tasksText) {
  const out = new Map();
  let inTable = false;
  for (const line of String(tasksText).split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) { inTable = false; continue; }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^type$/i.test(cells[0]) && /spec/i.test(cells[1])) { inTable = true; continue; }
    if (!inTable) continue;
    if (/^:?-+:?$/.test(cells[0])) continue;
    const producesSpec = /yes/i.test(cells[1]);
    for (const m of cells[0].matchAll(/`([a-z][a-z0-9-]*)`/g)) out.set(m[1], producesSpec);
  }
  if (out.size === 0) {
    throw new Error('the register carries no readable type table — deriving from an empty one would strip the spec bucket from every type, which reads as a pass and is a lie about six of them (G-13)');
  }
  return out;
}

/** The work-item types whose row in the register's type table answers "Yes" to a spec. */
export function specProducingTypes(tasksText) {
  return new Set([...parseTypeTable(tasksText)].filter(([, yes]) => yes).map(([t]) => t));
}

/**
 * The legal iteration buckets for one work-item type.
 *
 * A type that produces no spec cannot have spent an iteration on one, so the spec step is
 * removed for it — which is the whole reason the vocabulary is type-derived rather than flat.
 * An unresolvable type throws (`G-13`): a guard that cannot derive its own vocabulary has
 * validated nothing, and passing in that state is `INC-07` again.
 */
export function iterationBuckets(skillText, tasksText, type) {
  const table = parseTypeTable(tasksText);
  if (!type || !table.has(type)) {
    throw new Error(`cannot derive iteration buckets: the work-item type "${type || '(none)'}" is not in the register's type table, so there is no vocabulary to check against (G-13)`);
  }
  const producesSpec = table.get(type);
  return procedureReturnPoints(skillText)
    .filter((p) => producesSpec || !/\bspec\b/i.test(p.heading))
    .map((p) => p.slug);
}

/** The work item a log belongs to, from the filename convention `progress/README.md` mandates. */
export function workItemIdFromLog(filename) {
  const m = String(filename).match(/-task(\d+)-/i);
  return m ? `TASK-${m[1]}` : null;
}

/**
 * A done block whose `iterations` reads `passed` must say where those iterations went.
 *
 * Same dated-threshold mechanism as `doneBlockRequiredFrom` and `iterationsRequiredFrom`,
 * reused rather than duplicated: a new log cannot slip through, and a log written before the
 * convention is not retroactively demanded to carry a dimension nobody told it to write.
 *
 * `iterations: not_applicable` is exempt by construction — there are no cycles to attribute.
 */
export function validateIterationSplitRequired(block, date, since, label = '') {
  const at = label ? `${label}: ` : '';
  if (!date || date < since) return [];
  if (block?.iterations?.status !== 'passed') return [];
  if (!('iteration_split' in (block ?? {}))) {
    return [{ message: `${at}the done block carries \`iterations\` but no \`iteration_split\`. The convention has existed since ${since}, and a bare count says an item took N passes without saying whether they were author review, slice rework or gate rework — which is the split every slice-seam proposal is currently guessing at (TASK 72)` }];
  }
  return [];
}

/**
 * The split's own shape: legal buckets, no bucket twice, and counts that agree with
 * `iterations`.
 *
 * The sum check is what stops the field being decorative. Without it the split can say
 * anything and still pass, which is a worse outcome than not having the field — it looks
 * like a measurement.
 *
 * Shape findings return before the arithmetic: a report saying "and also the total is wrong"
 * about entries it already rejected is noise, not a second finding.
 */
export function validateIterationSplit(block, buckets, label = '') {
  const at = label ? `${label}: ` : '';
  const d = block?.iteration_split;
  if (!d || d.status !== 'passed' || !(d.evidence?.length)) return [];

  const findings = [];
  const seen = new Set();
  let sum = 0;

  for (const entry of d.evidence) {
    const m = entry.match(/^([a-z][a-z0-9_-]*)=(\d+)$/);
    if (!m) {
      findings.push({ message: `${at}\`iteration_split\` evidence "${entry}" is not a \`bucket=count\` pair. A future evaluator reads this without interpreting prose, which is the same reason \`iterations\` must be a bare integer` });
      continue;
    }
    const [, bucket, n] = m;
    if (!buckets.includes(bucket)) {
      findings.push({ message: `${at}\`iteration_split\` names bucket \`${bucket}\`, which is outside the vocabulary derived for this item's type — the legal set is: ${buckets.join(' | ')}` });
      continue;
    }
    if (seen.has(bucket)) {
      findings.push({ message: `${at}\`iteration_split\` names \`${bucket}\` twice. Summing the two would pass the arithmetic and hide a typo, so it is a finding instead` });
      continue;
    }
    seen.add(bucket);
    sum += Number(n);
  }
  if (findings.length) return findings;

  const total = block?.iterations;
  if (total?.status === 'passed' && /^\d+$/.test(total.evidence?.[0] ?? '')) {
    const want = Number(total.evidence[0]);
    if (sum !== want) {
      findings.push({ message: `${at}\`iteration_split\` sums to ${sum}, but \`iterations\` reads ${want}. The two numbers describe the same cycles and must agree, or the split is decorative` });
    }
  }
  return findings;
}
