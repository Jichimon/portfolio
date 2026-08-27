#!/usr/bin/env node
// Builds the EVAL-001 work-item extract: the second corpus the evaluation needs and the
// trace index does not cover — TASKS.md's register, the `done:` block of every progress
// log, and the citation graph between work items. Read-only. Counts and points; it does
// not interpret. Prints the whole document to stdout for redirection, preamble included,
// so a re-run reproduces the committed file byte for byte.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------- 1 · run-dir time spans
// EVAL-000 is dated 2026-08-18 and scored two directories by name. Everything that starts
// after its last scored event is the post-baseline set. The cut is drawn from the ts
// fields rather than from directory mtimes, which a checkout would rewrite.
const BASELINE_SCORED = new Set([
  '5751ce4c-d1e6-4e94-ba07-522038d27915',
  '2ac4fd9f-d33b-4c7b-b982-6681cb7dfee0',
]);

const runsDir = path.resolve('evidence/runs');
const runDirs = existsSync(runsDir)
  ? readdirSync(runsDir).filter((d) => statSync(path.join(runsDir, d)).isDirectory()).sort()
  : [];

const runRows = [];
for (const dir of runDirs) {
  const dirPath = path.join(runsDir, dir);
  const files = readdirSync(dirPath).filter((f) => f.endsWith('.jsonl')).sort();
  let first = null;
  let last = null;
  let events = 0;
  const agents = new Set();
  for (const file of files) {
    for (const line of readFileSync(path.join(dirPath, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let ev;
      try { ev = JSON.parse(line); } catch { continue; }
      events++;
      if (ev.agent) agents.add(ev.agent);
      const ts = ev.ts || ev.timestamp;
      if (typeof ts === 'string') {
        if (first === null || ts < first) first = ts;
        if (last === null || ts > last) last = ts;
      }
    }
  }
  runRows.push({ dir, files: files.length, events, first, last, agents: [...agents].sort() });
}

const day = (ts) => (ts ? ts.slice(0, 10) : '—');
const baselineLast = runRows
  .filter((r) => BASELINE_SCORED.has(r.dir))
  .map((r) => r.last)
  .filter(Boolean)
  .sort()
  .pop() ?? '';
const partition = (r) => {
  if (BASELINE_SCORED.has(r.dir)) return 'BASELINE';
  if (!r.first) return 'undated';
  return r.first > baselineLast ? 'post' : 'pre';
};

// -------------------------------------------------------------------- 2 · the register
// Header shape: `## TASK 60 — <title> · `type` · STATUS · <optional trailing prose>`
const tasksText = readFileSync(path.resolve('TASKS.md'), 'utf8');
// Split CRLF-tolerantly: a stray \r left on the line makes `.` fail to reach `$`, and the
// header regex below then matches nothing at all — silently, which is the worst shape.
const tasksLines = tasksText.split(/\r?\n/);
const items = [];
for (let i = 0; i < tasksLines.length; i++) {
  const m = /^## TASK (\d+) — (.*)$/.exec(tasksLines[i]);
  if (!m) continue;
  const rest = m[2];
  const type = (/`([a-z]+)`/.exec(rest) || [])[1] || '(none)';
  const status = (/\b(DONE|TODO|BLOCKED|DROPPED)\b/.exec(rest) || [])[1] || '(none)';
  items.push({ id: Number(m[1]), line: i + 1, type, status, title: rest.split(' · ')[0].trim(), start: i });
}
items.sort((a, b) => a.start - b.start);
for (let i = 0; i < items.length; i++) {
  items[i].end = i + 1 < items.length ? items[i + 1].start : tasksLines.length;
}

// Which other items each entry cites — the K3 candidate graph, unjudged.
for (const it of items) {
  const body = tasksLines.slice(it.start + 1, it.end).join('\n');
  const cited = new Set();
  for (const c of body.matchAll(/\bTASK[\s-]?(\d+)\b/g)) {
    const n = Number(c[1]);
    if (n !== it.id) cited.add(n);
  }
  it.cites = [...cited].sort((a, b) => a - b);
}

// ------------------------------------------------------- 3 · the `done:` block digest
const progressDir = path.resolve('progress');
const logs = readdirSync(progressDir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
const logRows = [];
for (const file of logs) {
  const text = readFileSync(path.join(progressDir, file), 'utf8');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^done:\s*$/.test(l));
  const taskIds = [...new Set([...file.matchAll(/task(\d+)/gi)].map((m) => Number(m[1])))];
  if (start === -1) {
    logRows.push({ file, taskIds, hasDone: false, dims: [], iterations: null });
    continue;
  }
  const dims = [];
  let iterations = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*$/.test(l) || /^```/.test(l) || /^\S/.test(l)) break;
    const m = /^\s{2}([a-z_]+):\s*\{(.*)$/.exec(l);
    if (!m) continue;
    const name = m[1];
    const body = m[2];
    const status = (/status:\s*([a-z_]+)/.exec(body) || [])[1] || '(none)';
    const evMatch = /evidence:\s*\[(.*?)\]/s.exec(body);
    const emptyEvidence = !evMatch || evMatch[1].trim() === '';
    dims.push({ name, status, emptyEvidence, line: i + 1 });
    if (name === 'iterations') {
      iterations = (/evidence:\s*\["([^"]*)"/.exec(body) || [])[1] ?? '(no evidence array)';
    }
  }
  logRows.push({ file, taskIds, hasDone: true, dims, iterations, doneLine: start + 1 });
}

// ------------------------------------------------------------------------ 4 · printing
const out = [];
const p = (s = '') => out.push(s);

p('# `EVAL-001` work-item extract — the register, every `done:` block, and the citation graph');
p();
p('**Not a scorecard.** This is tool output (`D2`), generated so `harness-evaluator` does not spend its 60 turns re-deriving from 60+ `TASKS.md` entries and ' + logs.length + ' `progress/` logs what a script can count — the reading half of `P-09`, measured by `TASK 55` at 3 of 3 slices surviving on a pre-written extract against 0 of 1 on "go read the sources". It counts and points; it interprets nothing. Every row carries an exact pointer, so any of it can be checked with a targeted `Grep` rather than trusted (`P-11`).');
p();
p('**Reproduce this file** with:');
p();
p('```');
p('node progress/2026-08-27-13-build-workitem-extract.mjs > progress/2026-08-27-13-eval001-workitem-extract.md');
p('```');
p();
p('Its companion is `progress/2026-08-27-12-eval001-trace-index.md`, which covers `evidence/runs/`. Between them the two corpora the evaluation reads are precomputed; nothing else needs an unbounded walk.');
p();
p('## Corpus size, measured');
p();
p('| | count |');
p('|---|---|');
p(`| work items in \`TASKS.md\` | ${items.length} |`);
p(`| — \`DONE\` | ${items.filter((i) => i.status === 'DONE').length} |`);
p(`| — \`TODO\` | ${items.filter((i) => i.status === 'TODO').length} |`);
p(`| \`progress/\` logs (excluding README) | ${logs.length} |`);
p(`| — carrying a \`done:\` block | ${logRows.filter((r) => r.hasDone).length} |`);
p(`| — carrying an \`iterations\` dimension | ${logRows.filter((r) => r.iterations !== null).length} |`);
p(`| run directories under \`evidence/runs/\` | ${runRows.length} |`);
p(`| — post-baseline (first event after ${baselineLast || 'n/a'}) | ${runRows.filter((r) => partition(r) === 'post').length} |`);
p(`| — scored by \`EVAL-000\` | ${runRows.filter((r) => partition(r) === 'BASELINE').length} |`);
p(`| — pre-baseline, unscored | ${runRows.filter((r) => partition(r) === 'pre').length} |`);
p(`| — undated (no \`ts\` on any event) | ${runRows.filter((r) => partition(r) === 'undated').length} |`);
p();
p('## 1 · Run directories by time span — the scope partition, drawn from `ts` and not assumed');
p();
p('`BASELINE` marks the two directories `EVAL-000` scored by name. `post` is every directory whose first event postdates the last event in those two. The cut uses event timestamps rather than file mtimes, which a checkout rewrites.');
p();
p('| run dir | partition | first event | last event | files | events | agents seen |');
p('|---|---|---|---|---|---|---|');
for (const r of runRows.slice().sort((a, b) => (a.first || '').localeCompare(b.first || ''))) {
  p(`| \`${r.dir}\` | ${partition(r)} | ${day(r.first)} | ${day(r.last)} | ${r.files} | ${r.events} | ${r.agents.join(', ') || '—'} |`);
}
p();
p('## 2 · The register — every work item, its type, its status, its logs');
p();
p('`cites` is every other work-item id appearing in that entry\'s own section: the citation graph, unjudged. An item citing an earlier one is a `K3` **candidate**, not an escaped defect — deciding which is the evaluator\'s job.');
p();
p('| id | type | status | title | `TASKS.md` line | `progress/` logs | cites |');
p('|---|---|---|---|---|---|---|');
for (const it of items) {
  const own = logRows.filter((r) => r.taskIds.includes(it.id)).map((r) => r.file);
  const logCell = own.length === 0 ? '—' : (own.length <= 3 ? own.map((f) => `\`${f}\``).join('<br>') : `${own.length} logs: \`${own[0]}\` … \`${own[own.length - 1]}\``);
  p(`| TASK ${it.id} | ${it.type} | ${it.status} | ${it.title.replace(/\|/g, '\\|')} | ${it.line} | ${logCell} | ${it.cites.join(', ') || '—'} |`);
}
p();
p('## 3 · Every `done:` block, digested');
p();
p('`iterations` is read verbatim from the log\'s own prose and is therefore **`self-reported`**, never `observable` — `K1`\'s substrate is the work log, and the log is written by the entity being scored. `dimensions` lists each dimension as `name:status`, with `!` appended where the dimension claims `passed` with an empty or absent evidence array (`P-03`). A log with no `done:` block at all is marked `NO DONE BLOCK`.');
p();
p('| log | items | iterations | dimensions |');
p('|---|---|---|---|');
for (const r of logRows) {
  if (!r.hasDone) {
    p(`| \`progress/${r.file}\` | ${r.taskIds.join(', ') || '—'} | — | **NO DONE BLOCK** |`);
    continue;
  }
  const dims = r.dims.map((d) => `${d.name}:${d.status}${d.status === 'passed' && d.emptyEvidence ? '!' : ''}`).join(' · ');
  p(`| \`progress/${r.file}:${r.doneLine}\` | ${r.taskIds.join(', ') || '—'} | ${r.iterations ?? '**absent**'} | ${dims || '(none parsed)'} |`);
}
p();
p('## 4 · Dimension frequency across every `done:` block');
p();
p('The denominator for `P-03`: a dimension that no log declares is a dimension whose silence has never been read as coverage, and one declared `passed` with empty evidence is what `validateDone` already catches.');
p();
const freq = new Map();
for (const r of logRows) {
  for (const d of r.dims) {
    const e = freq.get(d.name) || { total: 0, passed: 0, partial: 0, na: 0, other: 0, emptyPassed: 0 };
    e.total++;
    if (d.status === 'passed') { e.passed++; if (d.emptyEvidence) e.emptyPassed++; }
    else if (d.status === 'partial') e.partial++;
    else if (d.status === 'not_applicable') e.na++;
    else e.other++;
    freq.set(d.name, e);
  }
}
p('| dimension | declared | passed | partial | not_applicable | other | passed with empty evidence |');
p('|---|---|---|---|---|---|---|');
for (const [name, e] of [...freq.entries()].sort((a, b) => b[1].total - a[1].total)) {
  p(`| ${name} | ${e.total} | ${e.passed} | ${e.partial} | ${e.na} | ${e.other} | ${e.emptyPassed} |`);
}
p();
p(`_Generated by \`progress/2026-08-27-13-build-workitem-extract.mjs\`. ${items.length} items · ${logs.length} logs · ${runRows.length} run directories._`);

console.log(out.join('\n'));
console.error(`[stderr summary] items=${items.length} logs=${logs.length} runs=${runRows.length} baselineLast=${baselineLast}`);
