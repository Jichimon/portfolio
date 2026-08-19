#!/usr/bin/env node
// Step 7's acceptance check (A24): the trace conforms, the counter is dense, redaction held,
// and the hooks that write it are actually registered.
//
// The last one is the point. A checker that only reads trace files passes forever on a
// repository whose hooks were never wired — INC-08, in the subsystem whose entire purpose is
// to make claims falsifiable.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTrace, validateWiring, validateVocabulary } from '../lib/evidence.mjs';
import { parseTerms } from '../lib/terms.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const HOOK = 'scripts/guards/hooks/record-event.mjs';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).evidence;
const termsPath = join(ROOT, 'private/banned-terms.txt');
const terms = existsSync(termsPath) ? parseTerms(readFileSync(termsPath, 'utf8')) : [];

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

if (existsSync(runsDir)) {
  for (const run of readdirSync(runsDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of readdirSync(join(runsDir, run.name)).filter((n) => n.endsWith('.jsonl'))) {
      const path = join(runsDir, run.name, f);
      const text = readFileSync(path, 'utf8');
      runs++;
      events += text.split('\n').filter((l) => l.trim()).length;
      findings.push(...validateTrace(text, terms, relative(ROOT, path).split('\\').join('/') + ':'));
    }
  }
}

console.log(`      ${cfg.recordedHookEvents.length} hook events wired · ${runs} trace file(s), ${events} event(s) validated`);
if (runs === 0) {
  console.log('      no trace on disk yet — gitignored operational output; the wiring above is what is asserted here');
}

if (findings.length === 0) {
  console.log('PASS  check-trace');
  process.exit(0);
}
console.error(`FAIL  check-trace  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.message}`);
process.exit(1);
