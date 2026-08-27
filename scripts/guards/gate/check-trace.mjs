#!/usr/bin/env node
// Step 7's acceptance check (A24): the trace conforms, the counter is dense, redaction held,
// and the hooks that write it are actually registered.
//
// The last one is the point. A checker that only reads trace files passes forever on a
// repository whose hooks were never wired — INC-08, in the subsystem whose entire purpose is
// to make claims falsifiable.
//
// TASK 12 slice 3: an orphan tool.result (validateTrace's `kind: 'delivery_loss'`) is a
// DELIVERY LOSS, not a writer defect — H-03 means no agent may ever clear one by editing the
// trace, so it cannot fail this step the same way a schema or seq defect does. It is instead
// counted, turned into a rate over every tool.result event read, and floored against
// guards.config.json's measured `maxRequestLossRate`, exactly as T-03 floors the mutation
// score. Every other finding validateTrace produces still fails this step unconditionally,
// at any floor.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTrace, validateWiring, validateVocabulary } from '../lib/evidence.mjs';
import { parseTerms } from '../lib/terms.mjs';

// `--root <dir>` points this at a fixture tree instead of the real repository — this guard's
// OWN red-path battery, same flag and same reason as check-terms.mjs (P-14): proving the
// floor in red needs a corpus whose loss rate is known, and the real trace's rate only ever
// moves in one direction.
const OVERRIDE = process.argv.indexOf('--root') >= 0 ? process.argv[process.argv.indexOf('--root') + 1] : null;
const ROOT = OVERRIDE ? resolve(OVERRIDE) : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const HOOK = 'scripts/guards/hooks/record-event.mjs';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).evidence;
const termsPath = join(ROOT, 'private/banned-terms.txt');
const terms = existsSync(termsPath) ? parseTerms(readFileSync(termsPath, 'utf8')) : [];
const maxRequestLossRate = cfg.maxRequestLossRate ?? 0;
const DELIVERY_LOSS = 'delivery_loss';

const findings = [];

findings.push(...validateVocabulary(cfg.traceEvents ?? []));

const settingsPath = join(ROOT, '.claude/settings.json');
if (!existsSync(settingsPath)) {
  findings.push({ message: '.claude/settings.json does not exist — nothing is wired' });
} else {
  findings.push(...validateWiring(JSON.parse(readFileSync(settingsPath, 'utf8')), cfg.recordedHookEvents ?? [], HOOK));
}

if (!existsSync(join(ROOT, HOOK))) findings.push({ message: `${HOOK} does not exist on disk` });

// Every trace on disk, validated. Traces are gitignored operational output, so a fresh clone
// legitimately has none — that is reported as a number, never as a pass.
const runsDir = join(ROOT, 'evidence/runs');
let runs = 0;
let events = 0;
let toolResults = 0;
let deliveryLosses = 0;

if (existsSync(runsDir)) {
  for (const run of readdirSync(runsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of readdirSync(join(runsDir, run.name)).filter((n) => n.endsWith('.jsonl'))) {
      const path = join(runsDir, run.name, f);
      const text = readFileSync(path, 'utf8');
      runs++;
      const lines = text.split('\n').filter((l) => l.trim());
      events += lines.length;
      for (const line of lines) {
        try { if (JSON.parse(line).ev === 'tool.result') toolResults++; } catch { /* validateTrace reports the parse error */ }
      }
      for (const finding of validateTrace(text, terms, relative(ROOT, path).split('\\').join('/') + ':',
        { opaqueFields: cfg.opaqueFields ?? [], traceHeaderReasons: cfg.traceHeaderReasons ?? [] })) {
        if (finding.kind === DELIVERY_LOSS) deliveryLosses++;
        else findings.push(finding);
      }
    }
  }
}

// A zero-over-zero — a fresh clone, or a corpus with no tool.result events at all — is a
// clean 0, never NaN and never a division that fails: the measurement is absent, not failing.
const lossRate = toolResults === 0 ? 0 : deliveryLosses / toolResults;
const lossExceeded = lossRate > maxRequestLossRate;
const pct = (n) => `${(n * 100).toFixed(2)}%`;

console.log(`      ${cfg.recordedHookEvents.length} hook events wired · ${runs} trace file(s), ${events} event(s) validated`);
console.log(`      delivery loss: ${deliveryLosses}/${toolResults} tool.result event(s) — ${pct(lossRate)} (floor ${pct(maxRequestLossRate)})`);
if (runs === 0) {
  console.log('      no trace on disk yet — gitignored operational output; the wiring above is what is asserted here');
}

if (findings.length === 0 && !lossExceeded) {
  console.log('PASS  check-trace');
  process.exit(0);
}
const total = findings.length + (lossExceeded ? 1 : 0);
console.error(`FAIL  check-trace  ${total} finding(s)`);
for (const f of findings) console.error(`  ${f.message}`);
if (lossExceeded) {
  console.error(`  delivery-loss rate ${pct(lossRate)} exceeds the floor of ${pct(maxRequestLossRate)} — find the lost writes, never raise the number`);
}
process.exit(1);
