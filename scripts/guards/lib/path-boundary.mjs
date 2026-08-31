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
 * otherwise the last argument that isn't recognizably a flag — starts with `-` AND contains
 * no `/` or `\` (TASK 87). An argument that starts with `-` but contains a separator is kept
 * as a positional candidate rather than excluded, because a real flag never needs one and a
 * `..`-climb into a boundary cannot resolve without one.
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
    const long = a.match(/^--target-directory=(.*)$/);
    if (long) return [long[1]];
    // TASK 84's own audit: the glued short form (`-t/tmp`, `-tVALUE`, no space) fell through
    // to the positional fallback below entirely unrecognized. `-t/tmp` contains a `/`, so
    // TASK 87's own rule kept it as a positional candidate rather than excluding it — and
    // with two positionals left (`-t/tmp` and the real source), the SOURCE was picked as the
    // presumed destination, hiding it from the read check on the other side of this coin.
    const short = a.match(/^-t(.+)$/);
    if (short) return [short[1]];
  }
  // TASK 87: "looks like a flag" cannot be decided from `startsWith('-')` alone — a
  // destination reachable only through `..` (`-/../resources/y.md`, or the backslash form
  // `-..\resources\y.md` — `tokenize()` in shell.mjs does not treat an unquoted `\` as an
  // escape at all, so it survives into the argument intact) starts with '-' too, and
  // excluding it left only the SOURCE as a positional candidate, silently substituted as the
  // presumed destination. TASK 86's fix ("stop filtering, check everything") does not
  // transplant here: destinationArgs must still pick exactly ONE argument, and an existing
  // anti-regression case (a real trailing flag like `-v` must not become "the destination")
  // depends on excluding something. A real cp/ln/install flag never contains `/` or `\` in
  // its own syntax, while a `..`-climb cannot resolve to anything without a separator — so
  // requiring the absence of both is what tells the two apart.
  const positional = args.filter((a) => !(a.startsWith('-') && !/[/\\]/.test(a)));
  return positional.length ? [positional[positional.length - 1]] : [];
}

/** Every `of=` argument of a `dd` invocation, with the `of=` prefix stripped. `if=` reads. */
function ddTargets(args) {
  return args.filter((a) => /^of=/.test(a)).map((a) => a.replace(/^of=/, ''));
}

/**
 * Which of a command's arguments it READS (TASK 84). The mirror of `WRITES`, for `H-04`'s
 * boundary: `checkPath(..., 'read', ...)` already enforces it for the file tools, but
 * nothing enforced it for the shell at all. `'all'` is every plain reader (`cat`, `head`,
 * ...) — no argument is a pattern or a destination, so every one is a candidate. `'pattern'`
 * (`grep`/`sed`/`perl`/`awk`) exempts exactly one argument — the search pattern or script,
 * which is text the shell interprets rather than a path it opens. `'source'` (`cp`/`ln`/
 * `install`) reuses `destinationArgs` and checks everything that ISN'T the destination.
 */
const READS = {
  cat: 'all', head: 'all', tail: 'all', tac: 'all', less: 'all', more: 'all',
  od: 'all', xxd: 'all', strings: 'all', wc: 'all', base64: 'all',
  diff: 'all', cmp: 'all',
  grep: 'pattern', egrep: 'pattern', fgrep: 'pattern',
  sed: 'pattern', perl: 'pattern', awk: 'pattern',
  cp: 'source', ln: 'source', install: 'source',
};

/** Every real read this map does NOT cover is a stated residual, not an oversight: `dd`,
 * `mv`, `rm`, interpreters (`node`, `python`) handed a protected path, and PowerShell-native
 * readers stay out — `private/` carries no write boundary at all today (`TASK 91`), and a
 * script the agent writes then executes is `architecture.md §L`'s residual, not this one's.
 *
 * This roster also decides more than it looks like it does, and TASK 94 measured it: input
 * redirection (`cat < private/x`) and process substitution (`diff <(cat private/x) …`) are
 * denied today ONLY because the head sits here in `'all'` mode and every argument is checked
 * anyway — neither construct is understood. Off the roster (`node -e 1 < private/x`) the same
 * form passes. So an entry removed from this map silently widens a residual §L records; that
 * is a property of the roster, not of the mechanism (`P-13`). */

/**
 * grep/egrep/fgrep/sed/perl/awk: the short and long flags that supply the pattern/script
 * TEXT (never a file — exempt from the read check) versus the flags that supply a FILE the
 * tool reads patterns/instructions FROM (a real read — stays checked). Declared per head
 * because the grammars differ: awk has no `-e`, and only grep/sed/awk have a `-f`.
 */
const TEXT_FLAG_LETTER = { grep: 'e', egrep: 'e', fgrep: 'e', sed: 'e', perl: 'e' };
const TEXT_FLAG_LONG = { grep: 'regexp', egrep: 'regexp', fgrep: 'regexp', sed: 'expression', awk: 'source' };
const FILE_FLAG_LETTER = { grep: 'f', egrep: 'f', fgrep: 'f', sed: 'f', awk: 'f' };
const FILE_FLAG_LONG = { grep: 'file', egrep: 'file', fgrep: 'file', sed: 'file', awk: 'file' };

/**
 * Does `token` carry the short flag `letter`, and what (if anything) is glued after it?
 * `token[1]` — the character right after `-` — always decides unambiguously first. Beyond
 * that, `deepSearch` gates whether clustering behind OTHER letters is even attempted
 * (`-ne`, `-pe1`, real `perl` one-liners, mirroring `inPlaceFlag`'s own `/^-(?!-)[a-zA-Z]*i/`
 * style): it is only safe when `letter` is the ONLY recognized letter for this head. `perl`
 * has no file-letter, so its `-e` search may range freely. `grep`/`egrep`/`fgrep`/`sed` have
 * BOTH `e` and `f` — deep-searching either one found `-fprivate/x` misread as a CLUSTERED
 * text flag, because "private" itself contains an "e": `[a-zA-Z]*e` backtracks straight past
 * the real `-f` and matches "-fprivat" + "e", exempting the file instead of reading it as
 * `-f`'s glued value. Confirmed as a real, not hypothetical, regression while building this
 * fix. Position-1 anchoring alone still catches every bypass the audit actually demonstrated
 * (`-e.`, `--regexp=.`, `-f`, `--file=`, `-pe1`); clustering `-e`/`-f` behind an UNRELATED
 * flag on these four tools (`-ie PATTERN`) is a narrower, undemonstrated residual, not a
 * silently reopened one — an unrecognized token still gets checked (`out.push`), it is
 * merely not decomposed into a flag and a value.
 */
function shortFlagGlued(token, letter, deepSearch) {
  if (!/^-(?!-)[a-zA-Z]/.test(token)) return undefined;
  if (token[1] === letter) return token.slice(2) || null;
  if (!deepSearch) return undefined;
  const m = token.match(new RegExp(`^-(?!-)[a-zA-Z]*${letter}`));
  if (!m) return undefined;
  return token.slice(m[0].length) || null;
}

/**
 * Every argument of a grep/sed/perl/awk invocation that is a real read target (TASK 84,
 * rewritten after an audit found the position-only version exempting the FILE whenever the
 * pattern was glued to its flag — `grep -e. private/x`, `perl -pe1 private/x` — because the
 * file became "the first non-flag token" once the pattern no longer was one).
 *
 * Never the value of a recognized pattern-flag (`-e`, `--regexp=`, `--expression=`, `-ne`,
 * `-pe1`, split or glued). ALWAYS the value of a recognized file-flag (`-f`, `--file=`) — that
 * value is a file the tool reads patterns/instructions from, the exact shape `grep -f
 * private/glossary.md /etc/hosts` needs caught. Otherwise, only when NO pattern-flag appears
 * anywhere in the command, the first bare unflagged positional is exempted as the implicit
 * pattern/script — never a later one, and never one preceded by any flag at all. Everything
 * else, flag-shaped or not, is checked: an unrecognized flag left unclassified is harmless
 * (TASK 86's own "check everything" direction), while wrongly exempting a real file is not.
 */
export function readArgsForPattern(head, args) {
  const textLetter = TEXT_FLAG_LETTER[head];
  const textLong = TEXT_FLAG_LONG[head];
  const fileLetter = FILE_FLAG_LETTER[head];
  const fileLong = FILE_FLAG_LONG[head];

  const textGlued = (a) => (textLetter ? shortFlagGlued(a, textLetter, !fileLetter) : undefined);
  const fileGlued = (a) => (fileLetter ? shortFlagGlued(a, fileLetter, !textLetter) : undefined);
  const isTextLong = (a) => Boolean(textLong) && (a === `--${textLong}` || a.startsWith(`--${textLong}=`));
  const isFileLong = (a) => Boolean(fileLong) && (a === `--${fileLong}` || a.startsWith(`--${fileLong}=`));
  const isTextFlag = (a) => textGlued(a) !== undefined || isTextLong(a);
  const isFileFlag = (a) => fileGlued(a) !== undefined || isFileLong(a);

  // `-f`/`--file` supplies the pattern too, just sourced from a file instead of inline — so a
  // positional after it is a file to SCAN, not an implicit pattern either. Both must be false
  // for the bare-positional exemption below to apply at all.
  const hasPatternSource = args.some((a) => isTextFlag(a) || isFileFlag(a));
  const out = [];
  let bareExempted = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const tg = textGlued(a);
    if (tg !== undefined) {
      if (tg === null && args[i + 1] !== undefined) i++; // split form: consumes the next token too
      continue;
    }
    if (isTextLong(a)) {
      if (!a.includes('=') && args[i + 1] !== undefined) i++;
      continue;
    }
    const fg = fileGlued(a);
    if (fg !== undefined) {
      out.push(fg ?? args[++i]); // glued value, or the next token in split form
      continue;
    }
    if (isFileLong(a)) {
      out.push(a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[++i]);
      continue;
    }
    if (!hasPatternSource && !bareExempted && !a.startsWith('-')) {
      bareExempted = true;
      continue;
    }
    out.push(a);
  }
  return out;
}

/** Does `args` name an explicit `-t`/`--target-directory` (any spelling `destinationArgs`
 * recognizes)? Lets `sourceArgs` tell "no explicit target, fell through to the positional
 * fallback" apart from "an explicit target was given" without duplicating that logic. */
function hasExplicitTargetFlag(args) {
  return args.some((a) => a === '-t' || a === '--target-directory'
    || /^--target-directory=/.test(a) || /^-t.+$/.test(a));
}

/**
 * Every argument of a cp/ln/install invocation that is a real source being read (TASK 84).
 * Normally everything that is not the resolved destination (`destinationArgs`).
 *
 * `ln` is the exception, found by the same audit: with no explicit target and exactly one
 * positional argument, `ln SOURCE` is valid and links SOURCE into the CWD — that argument IS
 * the source, not an implicit destination. `destinationArgs`' fallback was built for `cp`/
 * `install`, which need two positionals to do anything; treating `ln`'s lone argument as "the
 * destination" excluded the only thing there was to check.
 */
function sourceArgs(head, args) {
  if (head === 'ln' && !hasExplicitTargetFlag(args)) {
    const positional = args.filter((a) => !(a.startsWith('-') && !/[/\\]/.test(a)));
    if (positional.length <= 1) return args;
  }
  const dest = new Set(destinationArgs(args));
  return args.filter((a) => !dest.has(a));
}

/**
 * Best-effort detection of a Bash command reading or writing inside a protected boundary.
 *
 * Honest scope: this catches redirects, the common mutators and readers, and in-place
 * editors, all decided on the command AS TEXT, before the shell expands it. Two different
 * limits follow, and they are stated in architecture.md §L rather than papered over:
 *
 *   what the guard cannot SEE     a script the agent wrote and then executed, or an
 *                                 interpreter (`node`, `python`) handed a protected path.
 *   what does not EXIST yet       anything the shell resolves after this runs — glob,
 *                                 variable, brace, alias, a path relative to a `cd`, or a
 *                                 path arriving on stdin through a pipe. TASK 94.
 *
 * The second one reaches the command HEAD too, so it is H-01's concern as much as this
 * function's. Neither is closed by matching harder; §L holds the single statement of both,
 * and this comment is a pointer to it, never a second copy (G-10).
 */
export function checkBashPaths(command, boundaries, root = '') {
  const findings = [];
  const write = boundaries.write ?? [];
  const read = boundaries.read ?? [];

  const flagAgainst = (list) => (target, how) => {
    const rel = repoRelative(target, root);
    for (const b of list) {
      if (isInside(rel, b)) findings.push({ boundary: b, path: rel, how });
    }
  };
  const flagWrite = flagAgainst(write);
  const flagRead = flagAgainst(read);

  // Redirects and mutators are both read off the DECOMPOSED command rather than the raw
  // string. That is what makes documenting a command stop tripping the guard: heredoc
  // bodies are data, single-quoted spans are data, and `commandContexts` already knows the
  // difference — while still descending into substitutions, which are not (TASK 10).
  for (const ctx of commandContexts(command)) {
    for (const target of redirectTargets(ctx.raw)) flagWrite(target, 'redirect');

    const head = basename(ctx.argv[0]);
    const args = ctx.argv.slice(1);

    const wmode = WRITES[head];
    if (wmode === 'all') {
      // TASK 86: every argument is checked, flag-shaped or not. Deciding "this looks like
      // a flag" from raw text BEFORE resolving it as a path is what let `-/../resources`
      // — a flag-shaped argument that resolves through `..` straight into the boundary —
      // through unseen. Checking it anyway is safe: a real flag (`-rf`, `-v`) never
      // resolves to a path that equals or starts with a protected boundary, so it never
      // matches and is never flagged.
      for (const arg of args) flagWrite(arg, head);
    } else if (wmode === 'dest') {
      for (const d of destinationArgs(args)) flagWrite(d, `${head} (destination)`);
    } else if (wmode === 'of') {
      for (const d of ddTargets(args)) flagWrite(d, 'dd of=');
    // TASK 84: `wmode === 'inplace'` here survives mutation to `true` — proven equivalent,
    // not left unexamined. The mutant is reachable only when wmode is undefined (head not in
    // WRITES at all) or already 'inplace'; `inPlaceFlag(head, args)` below returns null for
    // any head that isn't 'sed'/'perl'/'awk', the exact three heads WRITES already maps to
    // 'inplace'. No head makes wmode undefined AND inPlaceFlag(head,...) truthy at once, so no
    // input distinguishes the real condition from `true`. Not suppressed with a Stryker
    // directive: comments preceding a chained `else if` attach (verified against
    // directive-bookkeeper.js) to the outer if/else chain's own line, not this branch's, so
    // the directive silently never matches — recorded here rather than left non-functional.
    } else if (wmode === 'inplace') {
      if (inPlaceFlag(head, args)) {
        for (const arg of args) flagWrite(arg, `${head} -i`);
      }
    }

    // TASK 84. Independent of the WRITES pass above: a command can read and write in the
    // same call (`sed -i` on a private/** path is denied here even though `private` is
    // absent from `boundaries.write`, because sed always reads its target before an
    // in-place edit writes it back).
    const rmode = READS[head];
    if (rmode === 'all') {
      for (const arg of args) flagRead(arg, head);
    } else if (rmode === 'pattern') {
      for (const arg of readArgsForPattern(head, args)) flagRead(arg, head);
    } else if (rmode === 'source') {
      for (const arg of sourceArgs(head, args)) flagRead(arg, `${head} (source)`);
    }
  }

  return { allowed: findings.length === 0, findings };
}
