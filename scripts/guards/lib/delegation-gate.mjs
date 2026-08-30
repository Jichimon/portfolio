// H-05 · the Run contract's enforcer. No write-capable delegation on an unapproved spec.
//
// The incident (INC-05): three implementers were launched on the strength of a *plan* the
// human had approved. The human had never seen the spec file. Worse, the spec's version
// moved after that approval, so the version implemented was one nobody had signed off.
// Both halves are gated here — `status: draft`, and `version` past `approved_version`.
//
// This is a PreToolUse guard on matcher `Agent`, not `SubagentStart`, because
// SubagentStart cannot block, and not `Task`, which is not a tool that exists [A4].
//
// Shape: loadEnv reads the filesystem, decideDelegation is pure. The tests exercise the
// pure half exhaustively and assert liveness against the real repository, so a renamed
// artifact fails loudly rather than turning the gate into a no-op.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isTemplate } from './templates.mjs';

/**
 * Minimal `key: value` reader over --- frontmatter or the first fenced yaml block.
 * Dependency-free on purpose: the fields this gate reads are flat scalars, and a YAML
 * parser would be a dependency added for three string comparisons.
 */
export function parseYamlish(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fence = text.match(/```ya?ml\r?\n([\s\S]*?)```/);
  const body = fm?.[1] ?? fence?.[1] ?? '';
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^([a-z_][a-z0-9_]*):(.*)$/i);
    if (!m) continue;
    out[m[1]] = unquote(stripComment(m[2]).trim());
  }
  return out;
}

export const unquote = (s) => s.replace(/^"(.*)"$|^'(.*)'$/, (_, a, b) => a ?? b);

/**
 * Drop a trailing `#` comment, but not a `#` inside quotes.
 *
 * Exported because the eval-case reader needs exactly this behaviour, and a quote-aware
 * scanner is precisely the kind of subtle function that drifts once it exists twice.
 */
export function stripComment(s) {
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '#') return s.slice(0, i);
  }
  return s;
}

/** A role's tools, from either `tools: A, B` or a yaml list. Null when absent. */
export function parseRoleTools(text) {
  const flat = parseYamlish(text).tools;
  if (flat) return flat.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

  // `-` must be followed by whitespace, or the closing `---` of the frontmatter parses as
  // a list item named "--". Found by the test, not by reading.
  const block = text.match(/^tools:[ \t]*\r?\n((?:[ \t]*-[ \t]+\S.*\r?\n?)+)/m);
  if (block) return block[1].split(/\r?\n/).map((l) => l.replace(/^[ \t]*-[ \t]+/, '').trim()).filter(Boolean);
  return null;
}

/**
 * Write-capability is read off the role's own tools list (H-05), against an allowlist of
 * tools known to be read-only. The direction matters: an unknown tool name — a new one the
 * runtime ships next month — is treated as write-capable, so the gate gets stricter rather
 * than blinder when something is added (P-16). A roster of write tools would do the opposite.
 */
export function isWriteCapable(tools, config) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return { capable: true, why: 'the role declares no tools list, so nothing proves it is read-only' };
  }
  const readOnly = new Set(config.readOnlyTools ?? []);
  const unknown = tools.filter((t) => !readOnly.has(t));
  if (unknown.length === 0) return { capable: false, why: 'every declared tool is on the read-only list' };
  return { capable: true, why: `holds ${unknown.join(', ')}` };
}

/** Every work item id named in a brief, normalized to TASK-N. */
export function extractWorkItems(brief) {
  const out = new Set();
  for (const m of String(brief).matchAll(/\bTASK[\s-]?(\d+)\b/gi)) out.add(`TASK-${m[1]}`);
  return [...out];
}

/**
 * The register's own vocabularies, derived from the register (`P-13`).
 *
 * Both lists are published at the head of `TASKS.md` — a `Status values:` line and a table
 * whose first header cell is `type`. Reading them from there rather than hardcoding them
 * means a type added to the table is honoured without touching this guard, and a type that
 * exists only in a heading is a finding rather than a silent pass.
 *
 * **They are read separately, and TASK 66 is why.** One function demanded both and threw
 * unless it had both, so a revision carrying statuses and no type table could not be read at
 * all. That is not hypothetical: the register's first six committed revisions
 * (2026-08-13 -> 2026-08-16) predate the type table and are shaped
 * `## TASK 0 — Case studies · `DONE`` — statuses, no type span. Requiring the table to read a
 * status blinded the K2 derivation over exactly the era `EVAL-000`'s baseline came from.
 *
 * Each keeps its own G-13 throw. A guard that cannot derive what it is asserting has asserted
 * nothing, and the two failures send the human to two different lines of the same file.
 */
function registerStatuses(lines) {
  const statuses = new Set();
  for (const line of lines) {
    const s = line.match(/^Status values:\s*(.+)$/);
    if (s) for (const m of s[1].matchAll(/`([^`]+)`/g)) statuses.add(m[1]);
  }
  if (statuses.size === 0) {
    throw new Error(
      'the work-item STATUS vocabulary could not be derived from the register: expected a "Status values:" line at its head. A guard that cannot classify an item must not clear it for delegation (G-13).',
    );
  }
  return statuses;
}

function registerTypes(lines) {
  const types = new Set();
  let inTypeTable = false;
  for (const line of lines) {
    if (/^\|\s*type\s*\|/i.test(line)) { inTypeTable = true; continue; }
    if (inTypeTable) {
      if (!line.startsWith('|')) { inTypeTable = false; continue; }
      // The separator row (`|---|---|`) carries no code spans, so it needs no special case.
      for (const m of (line.split('|')[1] ?? '').matchAll(/`([a-z]+)`/g)) types.add(m[1]);
    }
  }
  if (types.size === 0) {
    throw new Error(
      'the work-item TYPE vocabulary could not be derived from the register: expected a table whose first column header is `type`. A guard that cannot classify an item must not clear it for delegation (G-13).',
    );
  }
  return types;
}

/**
 * The register's heading shape: `## TASK 7 — title · \`type\` · \`STATUS\``, where the type is
 * the code span immediately BEFORE the status — positional, not "the first backticked word".
 *
 * TASK 74: it was the latter, and `.*?` being lazy with the /i flag meant the first
 * all-letter code span anywhere in the heading answered a rung-1 question. A `feature`
 * titled ``Fix the `slug` join`` parsed as type `slug`, which is in no `specRequiredFor`
 * list, so `H-05` stopped demanding a spec — a boundary failing OPEN on a word in a title.
 * Two entries misparsed on disk when this was found (`TASK 53` as `version`, `TASK 62` as `L`).
 *
 * The status is matched against the register's declared vocabulary rather than by shape:
 * `L` matches /^[A-Z ]+$/, so "looks like a status" would reintroduce the same bug one layer
 * down. Real headings also carry trailing annotations (`· **ran fifth**`), parenthetical
 * status text (`` `TODO` (needs TASK 30) ``) and post-status code spans, all of which this
 * tolerates because it anchors on the status rather than counting fields from either end.
 *
 * The scan needs the STATUS vocabulary only. `type` is whatever code span sits immediately
 * before the status, or null when there is none — classifying it against the type table is
 * `parseWorkItemTypes`'s job, one layer up (TASK 66). Anchoring on the status is what makes
 * that split safe: the type is still read positionally, never by shape.
 */
export const WORK_ITEM_HEADING = /^##\s+TASK\s+(\d+)\s+—\s*(.*)$/;

function scanWorkItemHeadings(tasksMd) {
  const lines = String(tasksMd).split(/\r?\n/);
  const statuses = registerStatuses(lines);
  const out = [];
  for (const line of lines) {
    const h = WORK_ITEM_HEADING.exec(line);
    if (!h) continue;
    const spans = [...h[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const statusAt = spans.findIndex((s) => statuses.has(s));
    if (statusAt < 0) continue;               // no status — unclassifiable, and absent denies
    out.push({
      id: `TASK-${h[1]}`,
      status: spans[statusAt],
      type: statusAt > 0 ? spans[statusAt - 1] : null,
    });
  }
  return out;
}

/**
 * The register's own type per work item. An item whose type span is absent or outside the
 * declared vocabulary is OMITTED rather than defaulted — `decideDelegation` already denies on
 * a missing type, so unclassifiable fails closed (TASK 74).
 */
export function parseWorkItemTypes(tasksMd) {
  const types = registerTypes(String(tasksMd).split(/\r?\n/));
  return new Map(
    scanWorkItemHeadings(tasksMd)
      .filter((w) => w.type !== null && types.has(w.type))
      .map((w) => [w.id, w.type]),
  );
}

/**
 * Every work item the register carries a heading for, classified or not.
 *
 * Needs NO vocabulary — that is the point. It answers "is this entry still in the file?",
 * which is a different question from "can its status be read?", and conflating the two made a
 * change to the `Status values:` line read as forty entries being deleted (TASK 66, P-16).
 */
export function parseWorkItemIds(tasksMd) {
  const out = new Set();
  for (const line of String(tasksMd).split(/\r?\n/)) {
    const h = WORK_ITEM_HEADING.exec(line);
    if (h) out.add(`TASK-${h[1]}`);
  }
  return out;
}

/** The register's own status per work item — same heading scan as parseWorkItemTypes,
 * reading the status span instead of the type span. A second hand-rolled heading regex
 * is exactly the drift TASK 74 already paid for once (TASK 65). */
export function parseWorkItemStatuses(tasksMd) {
  return new Map(scanWorkItemHeadings(tasksMd).map((w) => [w.id, w.status]));
}

/** Does this spec authorize write-capable work right now? */
export function specVerdict(spec) {
  const at = ` (${spec.path})`;
  if (spec.status === 'draft') {
    return { ok: false, reason: `its spec is still \`draft\` — the artifact the human approves is the spec file, and a plan approval is not this gate${at}` };
  }
  if (spec.status === 'superseded') {
    return { ok: false, reason: `its spec is \`superseded\` and no longer governs${at}` };
  }
  if (!spec.approved_version) {
    return { ok: false, reason: `its spec's approved_version is empty — it was never approved at the checkpoint${at}` };
  }
  if (spec.approved_version !== spec.version) {
    return { ok: false, reason: `its spec has drifted: version ${spec.version} is past approved_version ${spec.approved_version}, so the version about to be implemented is one nobody signed off${at}` };
  }
  return { ok: true };
}

const deny = (reason) => ({ allowed: false, reason });

/**
 * The whole decision, pure.
 * @param {{subagent_type?:string, prompt?:string, description?:string}} toolInput
 * @param {{config:object, roleTools:Map<string,string[]>, workItemTypes:Map<string,string>, specs:object[]}} env
 */
export function decideDelegation(toolInput, env) {
  const role = toolInput.subagent_type ?? '';
  const brief = `${toolInput.description ?? ''}\n${toolInput.prompt ?? ''}`;
  const { config, roleTools, workItemTypes, specs } = env;

  // An undeclared role has no tools list to read, so nothing proves it read-only.
  // Fail closed. Whether an undeclared role may be delegated AT ALL is G-05's question,
  // enforced at rung 2 by check-agents — deliberately not claimed here.
  const tools = roleTools.get(role) ?? null;
  const wc = isWriteCapable(tools, config);
  if (!wc.capable) return { allowed: true, reason: `read-only role "${role}": ${wc.why}` };

  const items = extractWorkItems(brief);
  if (items.length === 0) {
    return deny(`a write-capable delegation to "${role}" (${wc.why}) names no work item. A run with no work item is ungoverned by definition — put its TASK id in the brief`);
  }

  const specRequired = new Set(config.specRequiredFor ?? []);

  for (const item of items) {
    const type = workItemTypes.get(item);
    if (!type) {
      return deny(`the brief names ${item}, which is not in the work item register. Ids are stable and the register is authoritative — add the entry before delegating against it`);
    }
    if (!specRequired.has(type)) continue; // this type's approved artifact is not a spec

    const forItem = specs.filter((s) => s.work_item === item);
    if (forItem.length === 0) {
      return deny(`${item} is typed \`${type}\`, which produces a spec, and no spec file names it as its work_item. There is nothing approved to implement against`);
    }
    for (const spec of forItem) {
      const v = specVerdict(spec);
      if (!v.ok) return deny(`${item} cannot be delegated to a write-capable role: ${v.reason}`);
    }
  }

  return { allowed: true };
}

/** Read the artifacts the decision needs. The only impure half. */
export function loadEnv(root) {
  const config = JSON.parse(readFileSync(join(root, 'scripts/guards/guards.config.json'), 'utf8')).delegation;

  const roleTools = new Map();
  const agentDir = join(root, config.agentDir);
  if (existsSync(agentDir)) {
    for (const f of readdirSync(agentDir).filter((n) => n.endsWith('.md'))) {
      roleTools.set(f.replace(/\.md$/, ''), parseRoleTools(readFileSync(join(agentDir, f), 'utf8')));
    }
  }

  const register = join(root, config.register);
  const workItemTypes = existsSync(register)
    ? parseWorkItemTypes(readFileSync(register, 'utf8'))
    : new Map();

  const specs = [];
  const specDir = join(root, config.specDir);
  if (existsSync(specDir)) {
    for (const f of readdirSync(specDir).filter((n) => n.endsWith('.md') && !isTemplate(n))) {
      const fields = parseYamlish(readFileSync(join(specDir, f), 'utf8'));
      specs.push({ path: `${config.specDir}/${f}`, ...fields });
    }
  }

  return { config, roleTools, workItemTypes, specs };
}

/** What the hook calls. */
export function checkDelegation(root, toolInput) {
  return decideDelegation(toolInput ?? {}, loadEnv(root));
}
