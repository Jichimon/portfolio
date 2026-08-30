// TASK 66 · the substrate K2 was missing.
//
// EVAL-001 had to report K2 (done-reopens) as `unmeasurable` where EVAL-000 reported 2.
// Nothing recorded a status TRANSITION: TASKS.md carries the current status only, and the
// trace carries tool calls, not register states. The evaluator observed 0 reopens, could not
// distinguish that from 0 RECORDED, and declined to report 2 -> 0 as an improvement.
//
// The history is DERIVED FROM GIT rather than written by hand, and that choice is the whole
// design. The scorecard template defines `observable` as "read from an artifact the scored
// entity does not author". Agents cannot write to git — H-01, rung 1, a deny rule and a guard
// — so a git-derived transition list is observable by that definition, while a status-history
// line typed into TASKS.md by the orchestrator would be prose the scored entity wrote about
// itself. Deriving also needs no backfill: the whole history is already there.
//
// What git CANNOT say is why "done" meant two different things to the two parties, which is
// the thing K2 exists to surface. So the reason stays hand-written, as one line in the
// register entry — and it is checked AGAINST the derived history, which is the half that
// makes it more than a convention: the declaration cannot be quietly omitted, because the
// substrate that exposes the omission is not one anybody here can edit.
//
// The one blind spot, stated rather than discovered later: a reopen made and reversed inside
// a single commit is invisible. That is the honest boundary between the two metrics — K1
// counts implement->verify cycles inside a session, K2 counts what survives into the
// committed register.
//
// Everything here is pure except readRevisions, whose git runner is INJECTED — the same split
// delegation-gate.mjs already uses for decideDelegation and loadEnv. The real spawnSync lives
// in the two CLIs, in the shape check-terms.mjs already uses.

import { parseWorkItemStatuses, parseWorkItemIds, WORK_ITEM_HEADING } from './delegation-gate.mjs';

/**
 * The label and date the working tree carries as a revision. Not a date, on purpose: an
 * uncommitted status change is real and about to be recorded, and saying exactly how much
 * weight it carries is better than dating it from a clock this module does not own.
 */
export const UNCOMMITTED = '(uncommitted)';

/**
 * Consecutive-revision diff over the register's own status map.
 *
 * @param {{date:string, label:string, text:string}[]} revisions  chronological
 * @returns {{
 *   transitions: {date:string, label:string, id:string, from:string, to:string}[],
 *   unparseable: {date:string, label:string, reason:string}[],
 *   vanished:    {date:string, label:string, id:string, from:string}[],
 *   unclassified:{date:string, label:string, id:string, from:string}[],
 * }}
 *
 * A revision that will not parse is REPORTED and skipped, and the diff continues from the
 * last revision that did parse. Both halves matter: dropping the span would hide a real
 * change behind an unrelated parse failure, and swallowing the failure would let a blind
 * window read as "no transitions" — a wrong measurement, which C-01's logic makes worse than
 * a missing one.
 *
 * An item that disappears is reported too. Ids are stable and never reused and a RETIRED
 * entry stays in place, so a deletion is a defect — and a DONE item deleted outright would
 * erase its own K2 edge.
 *
 * VANISHED and UNCLASSIFIED are separated, and P-16 is why: asked at verify what breaks when
 * the register's own vocabulary moves, the answer was not "nothing". `RETIRED` was added to
 * the `Status values:` line once already; remove a token that entries still use and every one
 * of them stops classifying at once — which, folded together, reads as forty work items being
 * DELETED. The heading is the evidence that distinguishes them, and it needs no vocabulary to
 * read, so this stays correct exactly when the vocabulary is the thing that broke.
 */
export function deriveTransitions(revisions) {
  const transitions = [];
  const unparseable = [];
  const vanished = [];
  const unclassified = [];
  let prev = null;

  for (const { date, label, text } of revisions) {
    let cur;
    let ids;
    try {
      cur = parseWorkItemStatuses(text);
      ids = parseWorkItemIds(text);
    } catch (e) {
      unparseable.push({ date, label, reason: e.message });
      continue;
    }
    if (prev) {
      for (const [id, status] of cur) {
        const before = prev.get(id);
        if (before !== undefined && before !== status) {
          transitions.push({ date, label, id, from: before, to: status });
        }
      }
      for (const [id, before] of prev) {
        if (cur.has(id)) continue;
        (ids.has(id) ? unclassified : vanished).push({ date, label, id, from: before });
      }
    }
    prev = cur;
  }
  return { transitions, unparseable, vanished, unclassified };
}

/** The K2 set: every transition that LEFT `DONE`. Direction is the whole metric. */
export function leftDone(transitions) {
  return transitions.filter((t) => t.from === 'DONE');
}

/**
 * The K2 set grouped by where it went.
 *
 * `DONE -> RETIRED` is a consolidation — the register's own head says RETIRED means the
 * deliverable moved to another id, never that it was dropped — and summing it with
 * `DONE -> TODO` would report that as a failure of "done". The split is reported; which
 * destinations count as reopens is the reader's call, made in front of the numbers.
 */
export function byDestination(list) {
  const out = new Map();
  for (const t of list) {
    if (!out.has(t.to)) out.set(t.to, []);
    out.get(t.to).push(t);
  }
  return out;
}

/** The declaration line the convention in TASKS.md's head mandates. */
const REOPEN_LINE = /^\*\*Reopened (\d{4}-\d{2}-\d{2})\*\*/;

/**
 * Every `**Reopened <date>**` declaration, keyed by the work item whose SECTION it sits in.
 *
 * Section boundaries, never proximity: a scan that credited a line to the nearest preceding
 * heading would let one item's declaration silence another item's missing one. The heading
 * shape is imported rather than rewritten — a second hand-rolled register reader is the drift
 * TASK 74 and TASK 65 already paid for once.
 *
 * @returns {Map<string, string[]>} id -> declaration dates, in file order
 */
export function parseReopenDeclarations(tasksText) {
  const out = new Map();
  let current = null;
  for (const line of String(tasksText).split(/\r?\n/)) {
    const h = WORK_ITEM_HEADING.exec(line);
    if (h) { current = `TASK-${h[1]}`; continue; }
    if (line.startsWith('## ')) { current = null; continue; }   // a non-item section ends one
    if (!current) continue;
    const d = REOPEN_LINE.exec(line);
    if (!d) continue;
    if (!out.has(current)) out.set(current, []);
    out.get(current).push(d[1]);
  }
  return out;
}

/**
 * Both directions, and a dated threshold on each.
 *
 * Forward: a derived reopen on/after `since` with no declaration. This is the item's central
 * claim — git says what changed, and only the line says why done meant two different things.
 *
 * Backward: a declaration on/after `since` that the derived history does not show. The
 * self-staling property check-docs' ignore list already uses, so the register cannot
 * accumulate lines describing reopenings that never happened.
 *
 * COUNTED, not merely present. One line cannot account for two separate disagreements about
 * what done meant, and "the item has a line somewhere" is the check that would let it.
 *
 * The threshold is the same mechanism as `doneBlockRequiredFrom` / `iterationsRequiredFrom` /
 * `iterationSplitRequiredFrom`, reused rather than duplicated: a new reopen cannot slip
 * through it, and history is not retroactively demanded to carry a line nobody had been told
 * to write. It is applied to BOTH sides — judging one and not the other would turn the
 * threshold itself into a source of false findings.
 */
export function validateReopenDeclarations(leftDoneList, declarations, since) {
  // An UNCOMMITTED transition is always in window, and it is stated rather than left to fall
  // out of string ordering. Two reasons, and the second is the load-bearing one: `'('` sorts
  // below `'2'`, so a working-tree reopen would drift out of the window by accident of ASCII
  // and nothing would say so (P-16). And the moment to write down why "done" meant two things
  // is the moment you change the status — not the commit after it, by which time the reason
  // is a memory. Demanding it here also removes the oscillation a commit-time check would
  // create: the line lands in the same edit, so the committed history already satisfies it.
  const inWindow = (d) => d === UNCOMMITTED || !since || d >= since;
  const derived = new Map();
  for (const t of leftDoneList.filter((t) => inWindow(t.date))) {
    derived.set(t.id, (derived.get(t.id) ?? 0) + 1);
  }
  const declared = new Map();
  for (const [id, dates] of declarations) {
    const n = dates.filter(inWindow).length;
    if (n > 0) declared.set(id, n);
  }

  const findings = [];
  for (const id of new Set([...derived.keys(), ...declared.keys()].sort())) {
    const d = derived.get(id) ?? 0;
    const c = declared.get(id) ?? 0;
    if (d === c) continue;
    if (c < d) {
      findings.push({ message: `TASKS.md: ${id} left \`DONE\` ${d} time(s) since ${since} and carries ${c} \`**Reopened <date>**\` declaration(s). The transition is derived from git and cannot be edited here; the reason for it can only be written by the person who reopened it, and K2 is a count of nothing without one (TASK 66)` });
    } else {
      findings.push({ message: `TASKS.md: ${id} carries ${c} \`**Reopened <date>**\` declaration(s) since ${since}, but the register's own committed history shows it leaving \`DONE\` ${d} time(s). A declaration describing a reopening that never happened inflates K2 with an event no artifact backs (TASK 66)` });
    }
  }
  return findings;
}

/**
 * The ledger `harness-evaluator` reads.
 *
 * It has to be a FILE: the role holds Read, Grep, Glob and Write and no Bash, so it cannot
 * run git. And it has to be generated at the moment of use rather than committed and checked
 * for freshness — a committed ledger oscillates, because the commit that records a status
 * change is itself the event the file then lacks, and the gate would demand a second commit
 * forever. This is the same shape as the two EVAL-001 corpora and what ADR-009 means by "the
 * context assembler is the script".
 *
 * The two markers `isGeneratedArtifact` requires are emitted deliberately: a dated file under
 * progress/ with no `done:` block is a check-procedures finding unless it DECLARES itself
 * generated. The renderer satisfies that guard rather than being exempted from it.
 */
export function renderLedger({ command, revisions, window, transitions, unparseable, vanished, unclassified = [] }) {
  const reopens = leftDone(transitions);
  const by = byDestination(reopens);
  const L = [];

  // Stryker disable StringLiteral: D3 scoped mutation to parsing, joining and validating, because mutating render templates produces equivalent mutants and noise — and this function is a render template that happens to live in lib/. Emptying a sentence of prose proves nothing about test quality; emptying a section GUARD or a loop does, so every other mutator stays live here and the structural assertions in status-history.test.mjs kill them. Measured rather than assumed: the first run left 35 StringLiteral mutants alive in this function alone, against 34 structural ones that were worth killing and now are.
  L.push('# Work-item status history — every transition the committed register records');
  L.push('');
  L.push('**Not a scorecard.** This is tool output (`D2`), derived from `git log -- TASKS.md` so `K2` (done-reopens) has a substrate that the scored entity did not author (`H-01` denies every agent a git write). It counts and points; it interprets nothing.');
  L.push('');
  L.push('**Reproduce this file** with:');
  L.push('');
  L.push('```');
  L.push(command);
  L.push('```');
  L.push('');
  L.push('**The one blind spot, stated rather than discovered later:** a reopen made and reversed inside a single commit is invisible here. That is the boundary between the two metrics — `K1` counts implement→verify cycles inside a session, `K2` counts what survives into the committed register.');
  L.push('');

  L.push('## Summary');
  L.push('');
  L.push('| | count |');
  L.push('|---|---|');
  L.push(`| revisions of \`TASKS.md\` read (committed + the working tree) | ${revisions} |`);
  L.push(`| — unparseable | ${unparseable.length} |`);
  L.push(`| window | ${window.from} → ${window.to} |`);
  L.push(`| transitions | ${transitions.length} |`);
  L.push(`| \`left_done\` — transitions away from \`DONE\` | ${reopens.length} |`);
  for (const [to, list] of [...by].sort()) L.push(`| — \`DONE\` → \`${to}\` | ${list.length} |`);
  L.push(`| items that vanished from the register | ${vanished.length} |`);
  L.push(`| items whose status stopped being readable | ${unclassified.length} |`);
  L.push('');
  L.push(`**\`K2\` reads \`left_done\`**, which is \`${reopens.length}\` over this window. \`DONE\` → \`RETIRED\` is listed separately and is a consolidation, not a reopening: the register's own head defines \`RETIRED\` as the deliverable moving to another id.`);
  L.push('');

  L.push('## Every transition');
  L.push('');
  if (transitions.length === 0) {
    L.push('_None in this window._');
  } else {
    for (const t of transitions) L.push(`- \`${t.date} · ${t.id} · ${t.from} → ${t.to}\` · \`${t.label}\``);
  }
  L.push('');

  if (unparseable.length > 0) {
    L.push('## Unparseable revisions');
    L.push('');
    L.push('A revision whose register head could not be read. The diff continues from the last one that parsed, so no transition is lost — but the window is not continuous and this section is why.');
    L.push('');
    for (const u of unparseable) L.push(`- \`${u.date}\` · \`${u.label}\` — ${u.reason}`);
    L.push('');
  }

  if (unclassified.length > 0) {
    L.push('## Items whose status stopped being readable');
    L.push('');
    L.push("Their headings are still in the register, so nothing was deleted — the status token stopped matching the `Status values:` line. Almost always a change to that line, and reported separately from a deletion because folding the two together points the reader at the wrong file.");
    L.push('');
    for (const u of unclassified) L.push(`- \`${u.date} · ${u.id}\` — last read \`${u.from}\` · \`${u.label}\``);
    L.push('');
  }

  if (vanished.length > 0) {
    L.push('## Items that disappeared from the register');
    L.push('');
    L.push('Ids are stable and never reused, and a `RETIRED` entry stays in place — so each of these is a defect, not a status change.');
    L.push('');
    for (const v of vanished) L.push(`- \`${v.date} · ${v.id}\` — last seen \`${v.from}\` · \`${v.label}\``);
    L.push('');
  }

  // Stryker restore StringLiteral

  return `${L.join('\n')}\n`;
}

/**
 * The revisions of `TASKS.md` this derivation reads, newest last.
 *
 * The git runner is INJECTED rather than imported, for the same reason `decideDelegation` is
 * pure and `loadEnv` is not: a shelling function nobody can test is a function whose mutants
 * nobody can kill, and this one decides the window every number below is computed over.
 *
 * `since` bounds the walk and keeps the gate step O(recent commits) rather than O(all of
 * them) — 31 revisions cost 1.1 s today, and the same walk at a year of this commit rate
 * costs ~25 s. **The revision immediately BEFORE the window is kept**, because a transition is
 * a diff: without its predecessor, the first revision in the window has nothing to differ
 * from and every change on that day disappears.
 *
 * The working tree is appended as a final revision labelled `(uncommitted)`. A status flipped
 * but not yet committed is real and about to be recorded; showing it as `(uncommitted)` says
 * exactly how much weight it carries.
 *
 * @param {{git:(args:string[])=>{status:number|null, stdout:string}, workingTree:string, since?:string}} io
 */
export function readRevisions(io) {
  const log = io.git(['log', '--reverse', '--format=%H%x09%ad', '--date=short', '--', 'TASKS.md']);
  if (log.status !== 0) {
    // G-13: a guard that cannot evaluate must deny. Reporting "0 transitions" because git was
    // unavailable is the silent pass this whole item exists to remove.
    throw new Error('git could not list the revisions of TASKS.md, so no status history can be derived. A count of zero here would be a measurement of the tooling, not of the register (G-13).');
  }

  const all = log.stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => {
    const [sha, date] = line.split('\t');
    return { sha, date, label: sha.slice(0, 7) };
  });

  let scoped = all;
  if (io.since) {
    const first = all.findIndex((r) => r.date >= io.since);
    scoped = first < 0 ? all.slice(-1) : all.slice(Math.max(0, first - 1));
  }

  const revisions = scoped.map((r) => {
    const show = io.git(['show', `${r.sha}:TASKS.md`]);
    if (show.status !== 0) {
      throw new Error(`git could not read TASKS.md at ${r.label}, so the window is not the one this run reports (G-13).`);
    }
    return { date: r.date, label: r.label, text: show.stdout };
  });

  revisions.push({ date: UNCOMMITTED, label: UNCOMMITTED, text: io.workingTree });
  return { revisions, walked: all.length, scoped: scoped.length };
}
