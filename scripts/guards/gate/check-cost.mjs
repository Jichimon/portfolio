#!/usr/bin/env node
// Thin CLI over lib/cost.mjs. TASK 70.
//
// REPORT-ONLY: it always exits 0. A cost figure is not yet a pass/fail property, and a gate
// step failing on a number nobody has calibrated is noise — `TASK 34`'s lesson. It is not
// registered in `scripts/gate.mjs` for the same reason.
//
// It prints to stdout rather than writing a file. Two reasons, both concrete: `evidence/**`
// is hook-only (`H-03`), and a generated artifact dropped into `progress/` is exactly what
// `TASK 65` clause 2 is open about — `check-procedures` cannot yet tell one from a work log.
// Redirect it where you want it:
//
//   node scripts/guards/gate/check-cost.mjs > /tmp/cost.md
//
// Reproducible by construction: same corpus in, byte-identical text out.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTrace,
  segmentDispatches,
  summarizeSegment,
  declaredModels,
  byteSubstrateStart,
  formatReport,
} from '../lib/cost.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUNS = join(ROOT, 'evidence/runs');
const AGENTS = join(ROOT, '.claude/agents');

if (!existsSync(RUNS)) {
  console.error('no evidence/runs/ — nothing to report on');
  process.exit(0);
}

const models = existsSync(AGENTS) ? declaredModels(AGENTS) : new Map();
const rows = [];
let malformed = 0;

for (const d of readdirSync(RUNS)) {
  const dir = join(RUNS, d);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    const events = parseTrace(readFileSync(join(dir, f), 'utf8'));
    malformed += events.malformed ?? 0;
    for (const seg of segmentDispatches(events)) {
      rows.push({ runId: d, ...summarizeSegment(seg, models) });
    }
  }
}

process.stdout.write(`${formatReport(rows, {
  substrateStart: byteSubstrateStart(rows),
  generatedFrom: 'evidence/runs',
  malformed,
})}\n`);
process.exit(0);
