#!/usr/bin/env node
// The K2 corpus builder (TASK 66). Read-only. Counts and points; it interprets nothing.
//
// `harness-evaluator` holds Read, Grep, Glob and Write and NO Bash, so it cannot run git —
// the status history has to reach it as a file. This is the script that writes that file, and
// it is run at the moment of use rather than kept committed and fresh: a committed ledger
// oscillates, because the commit that records a status change is itself the event the file
// then lacks. Same shape as the two EVAL-001 corpora, and what ADR-009 means by "the context
// assembler is the script".
//
//   node scripts/status-history.mjs > progress/status-history.md
//   node scripts/status-history.mjs --since 2026-08-20    # bound the walk
//
// Prints the whole document to stdout, preamble included, so a re-run reproduces it.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRevisions, deriveTransitions, renderLedger, UNCOMMITTED } from './guards/lib/status-history.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const sinceAt = process.argv.indexOf('--since');
const since = sinceAt > -1 ? process.argv[sinceAt + 1] : undefined;

// Same shape check-terms.mjs already uses. `-C ROOT` rather than a cwd, so the script works
// from anywhere; maxBuffer because TASKS.md is well past node's 1 MB default.
const git = (args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1e8 });

const { revisions, walked, scoped } = readRevisions({
  git,
  workingTree: readFileSync(join(ROOT, 'TASKS.md'), 'utf8'),
  since,
});

const { transitions, unparseable, vanished, unclassified } = deriveTransitions(revisions);

process.stdout.write(renderLedger({
  command: `node scripts/status-history.mjs${since ? ` --since ${since}` : ''} > progress/status-history.md`,
  revisions: revisions.length,
  window: {
    from: revisions[0]?.date ?? '(none)',
    to: revisions.at(-1)?.date ?? '(none)',
  },
  transitions,
  unparseable,
  vanished,
  unclassified,
}));

// stderr, so a redirection captures the document and the operator still sees the shape of it.
process.stderr.write(
  `      ${walked} revision(s) of TASKS.md exist, ${scoped} walked${since ? ` (--since ${since})` : ''} + the working tree as ${UNCOMMITTED}\n`,
);
