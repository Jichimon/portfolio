#!/usr/bin/env node
// Step 9's acceptance check. Thin CLI over lib/procedures.mjs.
//
// Two assertions, both named in the blueprint: the router resolves to procedures that exist,
// and no dated work log claims a `passed` dimension with nothing behind it.
//
// The second one is what closes the Evidence Contract's outstanding half. Until now, "done"
// was a convention in a template; it is now a condition of the gate.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRouter, validateRouter, parseDoneBlock, validateDone, logDate } from '../lib/procedures.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RULES = '.claude/rules/10-process.md';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).procedures ?? {};
const findings = [];

// --- the router -------------------------------------------------------------
const names = parseRouter(readFileSync(join(ROOT, RULES), 'utf8'));
findings.push(...validateRouter(names, (n) => existsSync(join(ROOT, '.claude/skills', n, 'SKILL.md'))));

// A skill nobody routes to is the mirror image and just as worth knowing: it will not be
// found when it is needed, because the router is where someone looks.
const skillsDir = join(ROOT, '.claude/skills');
const skills = existsSync(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
for (const s of skills.filter((s) => !names.includes(s))) {
  findings.push({ message: `.claude/skills/${s}/ exists but the router in ${RULES} never routes to it — a procedure nobody can be sent to` });
}

// --- done blocks ------------------------------------------------------------
// Dated logs only: progress/README.md carries the template, whose placeholders are not
// dimensions. The filter is a property — a work log is a dated file — not a list of skips.
const since = cfg.doneBlockRequiredFrom ?? '9999-12-31';
const logs = readdirSync(join(ROOT, 'progress')).filter((f) => f.endsWith('.md') && logDate(f));
let checked = 0;
let predating = 0;

for (const f of logs) {
  const block = parseDoneBlock(readFileSync(join(ROOT, 'progress', f), 'utf8'));
  if (!block) {
    if (logDate(f) >= since) {
      findings.push({ message: `progress/${f} carries no \`done\` block. The convention has existed since ${since}, and a log without one records that work happened, not that it finished (P-03)` });
    } else {
      predating++;
    }
    continue;
  }
  checked++;
  findings.push(...validateDone(block, `progress/${f}`));
}

console.log(`      router: ${names.length} procedure(s) — ${names.join(', ')}`);
console.log(`      done blocks: ${checked} validated, ${predating} log(s) predate the convention (before ${since})`);

if (findings.length === 0) {
  console.log('PASS  check-procedures');
  process.exit(0);
}
console.error(`FAIL  check-procedures  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${f.message}`);
process.exit(1);
