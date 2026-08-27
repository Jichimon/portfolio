#!/usr/bin/env node
// Builds the EVAL-001 trace index: one row per trace file (header/footer/posture/seq range)
// plus a full enumeration of every deny decision with its exact pointer. Read-only —
// touches nothing under evidence/ (H-03), only prints to stdout for redirection.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const runsDir = path.resolve('evidence/runs');
const runDirs = readdirSync(runsDir).filter((d) => statSync(path.join(runsDir, d)).isDirectory()).sort();

const fileRows = [];
const denyRows = [];
const excludedDirs = new Set(['rn', 'rn2', 'sep', 'unknown']);

for (const runDir of runDirs) {
  const excluded = excludedDirs.has(runDir);
  const dirPath = path.join(runsDir, runDir);
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const relPath = `evidence/runs/${runDir}/${file}`;
    const text = readFileSync(filePath, 'utf8');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    let firstHeaderSeq = null;
    let headerCount = 0;
    let lastHeaderSeq = null;
    let headerAgent = null;
    let headerPermMode = null;
    let observedPermModes = new Set();
    let footerCount = 0;
    let footerTermination = null;
    let lastSeq = null;
    let denyCount = 0;

    for (const line of lines) {
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof ev.seq === 'number') lastSeq = ev.seq;
      if (ev.ev === 'run.header') {
        headerCount++;
        if (firstHeaderSeq === null) firstHeaderSeq = ev.seq;
        lastHeaderSeq = ev.seq;
        if (!headerAgent) headerAgent = ev.agent;
        if (headerPermMode === null) headerPermMode = ev.permission_mode;
        if (ev.permission_mode) observedPermModes.add(ev.permission_mode);
      }
      if (ev.ev === 'run.footer') {
        footerCount++;
        footerTermination = ev.termination ? `${ev.termination.state}/${ev.termination.reason}` : null;
      }
      if (ev.ev === 'policy.decision' && ev.decision === 'deny') {
        denyCount++;
        denyRows.push({
          pointer: `${relPath}:${ev.seq}`,
          rule: ev.rule || ev.rule_id || '',
          guard: ev.guard || ev.guard_id || '',
          tool: ev.tool_name || ev.tool || '',
          reason: (ev.reason || ev.message || '').toString().slice(0, 140).replace(/\n/g, ' '),
          excluded,
        });
      }
    }

    fileRows.push({
      runDir,
      file,
      relPath,
      excluded,
      agent: headerAgent || (file.replace(/\.jsonl$/, '').replace(/-a[0-9a-f]{17}$/, '') || '(unnamed)'),
      headerCount,
      firstHeaderSeq,
      lastHeaderSeq,
      permMode: headerPermMode,
      observedPermModes: [...observedPermModes].join(','),
      footerCount,
      footerTermination,
      lastSeq,
      denyCount,
      lineCount: lines.length,
    });
  }
}

console.log('## Per-file index\n');
console.log('| run dir | file | agent | excluded | header seq(s) | permission_mode | footer | termination | events | denies |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of fileRows) {
  const headerSeqStr = r.headerCount === 0 ? '—' : (r.headerCount === 1 ? `${r.firstHeaderSeq}` : `${r.firstHeaderSeq}, ${r.lastHeaderSeq} (×${r.headerCount})`);
  const footerStr = r.footerCount === 0 ? 'NONE' : `×${r.footerCount}`;
  console.log(`| \`${r.runDir}\` | \`${r.file}\` | ${r.agent} | ${r.excluded ? 'YES' : 'no'} | ${headerSeqStr} | ${r.permMode || '—'}${r.observedPermModes ? ` (${r.observedPermModes})` : ''} | ${footerStr} | ${r.footerTermination || '—'} | ${r.lastSeq ?? r.lineCount} | ${r.denyCount} |`);
}

console.log('\n## Every deny decision, with pointer\n');
console.log('| # | pointer | rule | guard | tool | reason (truncated) | in excluded dir |');
console.log('|---|---|---|---|---|---|---|');
denyRows.forEach((d, i) => {
  console.log(`| ${i + 1} | \`${d.pointer}\` | ${d.rule || '—'} | ${d.guard || '—'} | ${d.tool || '—'} | ${d.reason || '—'} | ${d.excluded ? 'YES' : 'no'} |`);
});

console.error(`\n[stderr summary] files=${fileRows.length} runs=${runDirs.length} denies=${denyRows.length} (excluded-dir denies=${denyRows.filter(d=>d.excluded).length})`);
