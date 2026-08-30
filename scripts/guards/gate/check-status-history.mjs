#!/usr/bin/env node
// TASK 66's acceptance check. Thin CLI over lib/status-history.mjs.
//
// One assertion and one report, and the split is deliberate.
//
// THE ASSERTION: every transition away from `DONE` that the committed register shows carries
// a `**Reopened <date>**` line in its own entry, and no such line names a reopening the
// history does not show. Git says WHAT changed and cannot say why "done" meant two different
// things to the two parties — which is the whole of K2 — so the reason is written by hand and
// checked against a substrate no agent can edit (H-01 denies every git write at rung 1).
//
// THE REPORT: the derived counts print on every run, the way check-trace enumerates footerless
// runs. A number computed only when someone remembers to ask is a number nobody has. This is
// also the liveness check on the whole derivation: an unparseable revision or a vanished work
// item shows up here rather than at the moment an evaluation needs the corpus.
//
// G-13 throughout: git unavailable, a revision unreadable, or the register head unparseable
// all deny with the reason named. Reporting "0 transitions" because the tooling failed is a
// measurement of the tooling, and it is the exact silent pass this item exists to remove.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readRevisions, deriveTransitions, leftDone, byDestination,
  parseReopenDeclarations, validateReopenDeclarations, UNCOMMITTED,
} from '../lib/status-history.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).statusHistory ?? {};
const since = cfg.reopenDeclarationsFrom ?? '9999-12-31';

const git = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1e8 });
const tasksText = readFileSync(join(ROOT, 'TASKS.md'), 'utf8');

const findings = [];
let transitions = [];
let unparseable = [];
let vanished = [];
let unclassified = [];
let walked = 0;
let scoped = 0;

try {
  // The walk is bounded by the same date the declarations are, and readRevisions keeps the
  // revision BEFORE it — a transition is a diff, and without its predecessor the first
  // in-window revision has nothing to differ from.
  const read = readRevisions({ git, workingTree: tasksText, since });
  ({ walked, scoped } = read);
  ({ transitions, unparseable, vanished, unclassified } = deriveTransitions(read.revisions));
} catch (e) {
  findings.push({ message: `the status history could not be derived — ${e.message}` });
}

const reopens = leftDone(transitions);
const by = byDestination(reopens);

if (findings.length === 0) {
  findings.push(...validateReopenDeclarations(reopens, parseReopenDeclarations(tasksText), since));
}

// Reported, never failed. An unparseable revision is history, and H-03's lesson generalizes:
// a permanently-red step gets "fixed" by someone deleting the evidence. It is named on every
// run instead, so it stays visible without becoming background noise.
for (const u of unparseable) {
  console.log(`      NOTE  revision ${u.label} (${u.date}) does not parse — ${u.reason.split(':')[0]}`);
}
// A vanished item IS a defect — ids are stable, never reused, and a RETIRED entry stays in
// place — but it is a defect in the register's history, which nothing here can repair either.
for (const v of vanished) {
  console.log(`      NOTE  ${v.id} disappeared from the register at ${v.label} (${v.date}), last seen \`${v.from}\``);
}

// A heading still present whose status stopped matching the register's own `Status values:`
// line. Reported apart from a deletion because the two have different causes and different
// files to open, and because a vocabulary edit would otherwise read as a mass deletion.
for (const u of unclassified) {
  console.log(`      NOTE  ${u.id}'s status stopped being readable at ${u.label} (${u.date}), last read \`${u.from}\` — its heading is still there, so check the register's \`Status values:\` line`);
}

const destinations = [...by].sort().map(([to, list]) => `${list.length} → ${to}`).join(', ');
console.log(`      ${walked} committed revision(s) of TASKS.md, ${scoped} walked since ${since}, + the working tree as ${UNCOMMITTED}`);
console.log(`      ${transitions.length} transition(s) · K2 left_done: ${reopens.length}${destinations ? ` (${destinations})` : ''} · ${unparseable.length} unparseable, ${vanished.length} vanished, ${unclassified.length} unclassified`);

if (findings.length === 0) {
  console.log('PASS  check-status-history');
  process.exit(0);
}
console.error(`FAIL  check-status-history  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.message}`);
process.exit(1);
