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

/**
 * Which of a command's arguments it WRITES, decided by argument role rather than by
 * executable name alone (TASK 61). `'all'` checks every argument as a potential target —
 * flag-shaped or not (TASK 86) — since every one of them is a target for these commands;
 * `mv` stays `'all'` deliberately — a move writes BOTH ends, and H-02 forbids "moves", not
 * just writes. The narrower modes buy back the real reads the old blanket rule denied, and
 * close the `dd of=` bypass it missed.
 */
const WRITES = {
  rm: 'all', rmdir: 'all', tee: 'all', truncate: 'all', shred: 'all',
  chmod: 'all', chown: 'all', touch: 'all',
  mv: 'all',
  cp: 'dest', ln: 'dest', install: 'dest',   // the source is read
  dd: 'of',                                  // only of=; if= is a read
  sed: 'inplace', perl: 'inplace', awk: 'inplace',
};

/**
 * The argument that turns a sed/perl/awk invocation into an in-place edit, or `null` if
 * none is present — in which case the command contributes no findings at all.
 *
 * sed/perl: `--in-place[=SUFFIX]`, or a short-flag cluster containing `i` (`-i`, `-i.bak`,
 * `-pi`, `-ni`). awk: `-i` / `--include` — gawk's in-place extension is `-i inplace`, and
 * disambiguating that from its unrelated `-i` (library include) meaning is not attempted;
 * over-denying is the safe direction here.
 */
function inPlaceFlag(head, args) {
  if (head === 'sed' || head === 'perl') {
    return args.find((a) => /^--in-place(=|$)/.test(a) || /^-(?!-)[a-zA-Z]*i/.test(a)) ?? null;
  }
  if (head === 'awk') {
    return args.find((a) => a === '-i' || /^--include(=|$)/.test(a)) ?? null;
  }
  return null;
}

/**
 * The destination argument(s) of a `cp`/`ln`/`install` invocation: the value of
 * `-t VALUE` / `--target-directory=VALUE` / `--target-directory VALUE` when present,
 * otherwise the last non-flag argument.
 *
 * The `-t` branch matters on its own: `cp -t resources/ /tmp/x.md` must flag `resources/`
 * (the `-t` value), not `/tmp/x.md` — the last positional there is the SOURCE, and a naive
 * "flag the last argument" rule would wrongly allow it.
 */
function destinationArgs(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-t' || a === '--target-directory') {
      return args[i + 1] !== undefined ? [args[i + 1]] : [];
    }
    const m = a.match(/^--target-directory=(.*)$/);
    if (m) return [m[1]];
  }
  const positional = args.filter((a) => !a.startsWith('-'));
  return positional.length ? [positional[positional.length - 1]] : [];
}

/** Every `of=` argument of a `dd` invocation, with the `of=` prefix stripped. `if=` reads. */
function ddTargets(args) {
  return args.filter((a) => /^of=/.test(a)).map((a) => a.replace(/^of=/, ''));
}

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
    const mode = WRITES[head];
    if (!mode) continue;
    const args = ctx.argv.slice(1);

    if (mode === 'all') {
      // TASK 86: every argument is checked, flag-shaped or not. Deciding "this looks like
      // a flag" from raw text BEFORE resolving it as a path is what let `-/../resources`
      // — a flag-shaped argument that resolves through `..` straight into the boundary —
      // through unseen. Checking it anyway is safe: a real flag (`-rf`, `-v`) never
      // resolves to a path that equals or starts with a protected boundary, so it never
      // matches and is never flagged.
      for (const arg of args) flag(arg, head);
    } else if (mode === 'dest') {
      for (const d of destinationArgs(args)) flag(d, `${head} (destination)`);
    } else if (mode === 'of') {
      for (const d of ddTargets(args)) flag(d, 'dd of=');
    } else if (mode === 'inplace') {
      if (!inPlaceFlag(head, args)) continue;
      for (const arg of args) flag(arg, `${head} -i`);
    }
  }

  return { allowed: findings.length === 0, findings };
}
