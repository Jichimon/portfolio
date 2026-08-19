#!/usr/bin/env node
// THE PreToolUse entry point. One registration, several pure functions.
//
// Why one: PreToolUse fires per tool call, so N registrations mean N process spawns per
// command. Each policy below is unit-tested on its own; this file only dispatches and
// formats the verdict.
//
// Contract (docs/harness/contracts.md §3): stdin carries the hook JSON, and a denial is
// exit 2 with the reason on stderr. Every denial names the rule and the function, so a
// blocked action reads as a boundary rather than a malfunction.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkGitWrite } from '../lib/git-write.mjs';
import { checkPath, checkBashPaths } from '../lib/path-boundary.mjs';
import { redactToolInput } from '../lib/evidence.mjs';
import { checkRoleScope } from '../lib/role-scope.mjs';
import { record, loadTerms } from './trace-writer.mjs';

/**
 * FAIL CLOSED. Any internal error — an unreadable config, a torn file mid-write, a bug in a
 * pure function — denies the call rather than letting it through.
 *
 * Found in this repository, not imagined: a concurrent rewrite of guards.config.json left
 * the file momentarily unparseable, the top-level JSON.parse threw, the hook exited 1, and
 * the runtime treated that as a NON-BLOCKING hook error. A denied-by-H-01 write would have
 * run unguarded. Two orphaned tool.result events with no matching tool.requested are what
 * exposed it — the trace catching a hole in the guard that writes the trace.
 *
 * A guard that cannot evaluate cannot permit (`G-13`, from INC-12). The cost of this
 * direction is that a broken config denies everything until a human fixes it: loud,
 * correct and recoverable.
 */
async function main() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const CFG = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
  const B = CFG.boundaries;

  function readStdin() {
    try {
      return JSON.parse(readFileSync(0, 'utf8') || '{}');
    } catch {
      return {};
    }
  }

  const input = readStdin();
  const tool = input.tool_name ?? '';
  const ti = input.tool_input ?? {};

  // The request is recorded BEFORE the verdict, and the verdict as its own event. That order
  // is what makes an attempt legible: a request carrying a deny decision and no result means
  // the agent tried something dangerous and was stopped — the opposite of it having happened.
  const base = { tool_use_id: input.tool_use_id, tool };
  const target = redactToolInput(tool, ti, loadTerms(ROOT));
  record(ROOT, input, [{ ev: 'tool.requested', ...base, target }]);

  /** Deny with a reason the agent can act on. Exit 2 is the blocking code. */
  function deny(rule, guard, reason) {
    record(ROOT, input, [{ ev: 'policy.decision', ...base, decision: 'deny', source: 'guard', rule, guard, reason }]);
    console.error(`DENIED by ${rule} (${guard}): ${reason}`);
    console.error('This is a hard boundary, not a suggestion. See .claude/rules/00-hard-rules.md.');
    process.exit(2);
  }

  // A20: a role with a declared write scope is held to it by the runtime, not by its own
  // prose. Checked before the shared boundaries, because the narrower rule is the one whose
  // denial explains the situation best.
  const scope = checkRoleScope(input.agent_type, tool, ti, CFG.roleWriteScopes ?? {}, ROOT);
  if (!scope.allowed) deny('G-05', 'role-scope', scope.reason);

  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = ti.command ?? '';

    const git = checkGitWrite(command);
    if (!git.allowed) {
      const f = git.findings[0];
      const via = f.via?.length ? ` (via ${f.via.join(' → ')})` : '';
      deny('H-01', 'git-write', `${f.reason}${via} — the human owns commits, so work is left uncommitted for review`);
    }

    const paths = checkBashPaths(command, B, ROOT);
    if (!paths.allowed) {
      const f = paths.findings[0];
      deny(boundaryRule(f.boundary), 'path-boundary', `${f.how} targets ${f.path}, inside the protected "${f.boundary}" boundary`);
    }
  }

  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
    const target = ti.file_path ?? ti.notebook_path ?? '';
    const v = checkPath(target, B, 'write', ROOT);
    if (!v.allowed) {
      deny(boundaryRule(v.boundary), 'path-boundary', `${v.path} is inside the protected "${v.boundary}" boundary`);
    }
  }

  if (tool === 'Read' || tool === 'Grep' || tool === 'Glob') {
    const target = ti.file_path ?? ti.path ?? '';
    if (target) {
      const v = checkPath(target, B, 'read', ROOT);
      if (!v.allowed) {
        deny('H-04', 'path-boundary', `${v.path} holds the confidentiality mapping and is never read by an agent`);
      }
    }
  }

  if (tool === 'Agent') {
    // H-05: no write-capable delegation on an unapproved or drifted spec. The gate is
    // here rather than on SubagentStart because SubagentStart cannot block.
    const gatePath = join(ROOT, 'scripts/guards/lib/delegation-gate.mjs');
    if (existsSync(gatePath)) {
      const { checkDelegation } = await import('../lib/delegation-gate.mjs');
      const v = checkDelegation(ROOT, ti);
      if (!v.allowed) deny('H-05', 'delegation-gate', v.reason);
    }
  }

  /** Which hard rule owns a boundary. Derived from config, so adding one needs no code. */
  function boundaryRule(boundary) {
    return B.ruleFor?.[boundary] ?? 'H-02';
  }

  // Reaching here means no guard objected. Recorded explicitly: a request with no decision
  // would be indistinguishable from a crashed hook, and "the guard ran and allowed it" is a
  // different fact from "we do not know what the guard did".
  record(ROOT, input, [{ ev: 'policy.decision', ...base, decision: 'allow', source: 'guard' }]);
  process.exit(0);
}

main().catch((err) => {
  console.error(`DENIED by G-13 (pretooluse/fail-closed): the guard could not evaluate this call (${err?.code ?? err?.name ?? 'error'}).`);
  console.error('A guard that cannot evaluate cannot permit. Check scripts/guards/guards.config.json and .claude/settings.json.');
  process.exit(2);
});
