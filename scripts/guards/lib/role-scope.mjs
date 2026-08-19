// A20 · per-role write scope, enforced rather than trusted.
//
// One role has this today: `harness-evaluator`. Not because it is less reliable than the
// others, but because its value depends entirely on not being able to edit what it scores.
// An evaluator that could adjust the artifact it grades produces a number about nothing.
//
// The other roles' file sets stay PROCEDURAL — named in the brief, checked by the auditor —
// and that is a recorded decision, not an oversight (A21). The trigger for enforcing them is
// two roles writing concurrently.
//
// Scopes are an ALLOWLIST, which is the opposite direction from the boundaries in
// path-boundary.mjs. There, everything is permitted except a few protected trees; here,
// nothing is permitted except one. A role with no declared scope is unaffected.

import { isInside, repoRelative } from './path-boundary.mjs';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

/**
 * @param {string} agentType    the role, from the hook payload's agent_type
 * @param {string} tool
 * @param {object} toolInput
 * @param {Record<string,string[]>} scopes   role → allowed write prefixes
 * @param {string} root   the repository root, so an absolute payload path can be resolved
 *                        against it. Omitting this is INC-14: the scope is expressed
 *                        repository-relative and `Write` always sends an absolute path, so a
 *                        raw prefix test denies every authorized write.
 */
export function checkRoleScope(agentType, tool, toolInput = {}, scopes = {}, root = '') {
  const allowed = scopes[agentType];
  if (!allowed) return { allowed: true };

  // A scope cannot be enforced through a shell with any confidence — a script the role wrote
  // and then ran defeats every pattern. Rather than claim a boundary that leaks, a scoped
  // role may not use shell write vectors at all. Withholding beats guarding.
  if (SHELL_TOOLS.has(tool)) {
    return {
      allowed: false,
      reason: `"${agentType}" has an enforced write scope (${allowed.join(', ')}), and a scope cannot be held through a shell — this role is declared without one, so the call is refused rather than pattern-matched`,
    };
  }

  if (!WRITE_TOOLS.has(tool)) return { allowed: true };

  const raw = String(toolInput.file_path ?? toolInput.notebook_path ?? '');
  if (!raw.trim()) return { allowed: true };

  // Resolved the same way the deny boundaries resolve theirs, and for the same reason: the
  // scope is written repository-relative, the payload is not, and `..` has to be resolved
  // before the comparison or a path can climb out and back in.
  const target = repoRelative(raw, root);

  if (allowed.some((prefix) => isInside(target, prefix))) return { allowed: true };

  return {
    allowed: false,
    reason: `"${agentType}" may write only inside ${allowed.join(', ')}, and ${target} is outside it. This role's conclusions are only worth something if it cannot edit what it scores`,
  };
}
