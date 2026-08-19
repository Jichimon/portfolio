// H-02 resources/ · H-03 evidence/ · H-04 private/ · and .git/ for H-01's second vector.
//
// Two vectors, one policy. File tools carry a path; Bash carries a command that may
// reach the same path through a redirect, a mover, or an in-place editor. Denying only
// the first leaves the second wide open — which is why the file-tool deny rules in
// settings.json are necessary but not sufficient.

import { commandContexts, basename, redirectTargets } from './shell.mjs';

/**
 * Normalize for comparison: forward slashes, and `.`/`..` segments RESOLVED.
 *
 * Resolving them is not cosmetic. Comparing normalized strings without it let
 * `docs/../resources/x.md` — which resolves on disk to `resources/x.md` — fail the prefix
 * test and reach a protected tree. That bypass was live in H-02 and H-03 from step 6, and
 * was found by a sibling guard's test rather than by reading this function.
 *
 * A `..` that would climb above the start is dropped rather than preserved, so a path
 * reaching in from outside the repository resolves inward and is judged, not waved through.
 */
export function normalize(p) {
  const out = [];
  for (const seg of String(p).split(String.fromCharCode(92)).join('/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return out.join('/');
}

/** Does `target` fall inside `boundary`? Segment-aware: evidenceX/ is not evidence/. */
export function isInside(target, boundary) {
  const t = normalize(target);
  const b = normalize(boundary);
  return t === b || t.startsWith(b + '/');
}

/**
 * Resolve a path to a repository-relative one.
 *
 * A RELATIVE path is joined to the root before the `..` segments are resolved, because
 * `docs/../../portfolio/resources/x.md` is only recognizable as re-entering the repository
 * once you know where the repository is. Resolving it in isolation yields
 * `portfolio/resources/x.md`, which matches no boundary and slips through.
 */
export function repoRelative(target, root) {
  const r = normalize(root);
  const raw = String(target).split(String.fromCharCode(92)).join('/');
  const isAbsolute = /^([a-zA-Z]:)?\//.test(raw) || /^[a-zA-Z]:/.test(raw);
  const t = normalize(isAbsolute || !r ? raw : `${r}/${raw}`);

  // The prefix test folds case (INC-14). The hook derives root from its own module URL and
  // the runtime renders tool payloads independently, so the same directory arrives as
  // `C:/dev/...` and `c:/dev/...` in one session. A case-sensitive comparison then fails to
  // relativize, the absolute path matches no boundary, and H-02/H-03 fail OPEN — the guard
  // reporting "outside the protected tree" about a path plainly inside it.
  const tl = t.toLowerCase();
  const rl = r.toLowerCase();
  if (r && tl === rl) return '';
  if (r && tl.startsWith(rl + '/')) return t.slice(r.length + 1);
  return t;
}

/**
 * @param {string} filePath
 * @param {{write:string[],read:string[]}} boundaries
 * @param {'write'|'read'} mode
 * @param {string} root
 */
export function checkPath(filePath, boundaries, mode, root = '') {
  const rel = repoRelative(filePath, root);
  const list = mode === 'read' ? (boundaries.read ?? []) : (boundaries.write ?? []);
  for (const b of list) {
    if (isInside(rel, b)) {
      return { allowed: false, boundary: b, path: rel, mode };
    }
  }
  return { allowed: true, path: rel, mode };
}

/** Commands whose arguments name files they will modify or destroy. */
const MUTATORS = new Set(['rm', 'rmdir', 'mv', 'cp', 'tee', 'truncate', 'dd', 'shred',
  'install', 'chmod', 'chown', 'touch', 'ln']);

/** In-place editors: only dangerous with the relevant flag, but cheap to treat as such. */
const INPLACE = new Set(['sed', 'perl', 'awk']);

/**
 * Best-effort detection of a Bash command writing inside a protected boundary.
 *
 * Honest scope: this catches redirects, the common mutators, and in-place editors. It
 * does not and cannot catch a script the agent wrote and then executed. That residual
 * is stated in architecture.md §L rather than papered over.
 */
export function checkBashPaths(command, boundaries, root = '') {
  const findings = [];
  const write = boundaries.write ?? [];

  const flag = (target, how) => {
    const rel = repoRelative(target, root);
    for (const b of write) {
      if (isInside(rel, b)) findings.push({ boundary: b, path: rel, how });
    }
  };

  // Redirects and mutators are both read off the DECOMPOSED command rather than the raw
  // string. That is what makes documenting a command stop tripping the guard: heredoc
  // bodies are data, single-quoted spans are data, and `commandContexts` already knows the
  // difference — while still descending into substitutions, which are not (TASK 10).
  for (const ctx of commandContexts(command)) {
    for (const target of redirectTargets(ctx.raw)) flag(target, 'redirect');

    const head = basename(ctx.argv[0]);
    if (!MUTATORS.has(head) && !INPLACE.has(head)) continue;
    for (const arg of ctx.argv.slice(1)) {
      if (arg.startsWith('-')) continue;
      flag(arg, head);
    }
  }

  return { allowed: findings.length === 0, findings };
}
