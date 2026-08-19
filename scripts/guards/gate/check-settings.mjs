#!/usr/bin/env node
// Thin CLI over lib/settings.mjs.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSettings } from '../lib/settings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const HOOK = 'scripts/guards/hooks/pretooluse.mjs';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
const settingsPath = join(ROOT, '.claude/settings.json');

if (!existsSync(settingsPath)) {
  console.error('FAIL  check-settings  .claude/settings.json does not exist — the boundaries are declared but not wired');
  process.exit(1);
}

// Which tools the matcher MUST name is derived from the hook's own dispatch, not from a
// list written here (P-13). Add a branch to the hook and the matcher is required to carry
// it; a matcher naming a tool nothing dispatches on would have been the INC-08 failure.
const hookSrc = existsSync(join(ROOT, HOOK)) ? readFileSync(join(ROOT, HOOK), 'utf8') : '';
const requiredMatchers = [...new Set([...hookSrc.matchAll(/tool === '([A-Za-z]+)'/g)].map((m) => m[1]))];

const findings = validateSettings(
  JSON.parse(readFileSync(settingsPath, 'utf8')),
  cfg.boundaries,
  { hookPath: HOOK, hookExists: existsSync(join(ROOT, HOOK)), requiredMatchers },
);

const b = cfg.boundaries;
console.log(`      boundaries: ${(b.write ?? []).length} write, ${(b.read ?? []).length} read — each backed by a deny rule and the guard`);
console.log(`      matcher covers every tool the hook dispatches on: ${requiredMatchers.join(', ')}`);

if (findings.length === 0) {
  console.log('PASS  check-settings');
  process.exit(0);
}
console.error(`FAIL  check-settings  ${findings.length} finding(s)`);
for (const f of findings) console.error(`  ${(f.boundary ?? '-').padEnd(10)} ${f.message}`);
process.exit(1);
