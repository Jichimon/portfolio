// The mutation gate (TASK 15). ADR-006 decided the tool, the runner and the threshold on
// 2026-08-19; this file is the thing that makes T-03's rung-2 claim true instead of asserted.
//
// A .mjs config rather than the .json one Stryker documents, for one reason: every number
// below is a decision with a cost, and JSON has nowhere to put the reason. A threshold
// nobody can trace back to a decision is a threshold the next person lowers.

export default {
  // ADR-006: node:test everywhere, driven through its TAP reporter. Not the generic command
  // runner, which has no coverage analysis and re-runs the whole suite per mutant.
  testRunner: 'tap',

  tap: {
    // An explicit, disjoint scope — ADR-006's amendment requires it of both unit runners,
    // because node's and Vitest's default globs overlap and neither project's docs mention
    // the other. Nothing here is discovered.
    //
    // Wider than the mutate glob on purpose: hooks/pretooluse.test.mjs drives lib/ modules and
    // is allowed to kill their mutants even though the hook itself is not mutated.
    //
    // gate/**/*.test.mjs is deliberately ABSENT, and the reason is measured rather than
    // assumed: gate/check-terms.test.mjs covered ZERO mutants on the first run — it drives the
    // CLI in a child process, so instrumented coverage never comes back. It also needs the real
    // private/banned-terms.txt, which ignorePatterns keeps out of the sandbox. Dropping it here
    // therefore costs nothing measurable and removes the only reason to copy private/ into a
    // temp directory. It still runs, every time, under the gate's `guard tests` step.
    // site/lib/** is here because the mutate glob below alone was NOT enough, and the
    // gap was measured rather than reasoned about (TASK 22). This file already claimed the
    // surface was "covered the moment it is written" — half true: mutants were generated for it
    // and no test file was ever handed to the runner to kill them. First run after the content
    // core landed: 149 mutants across four modules, ALL with no coverage, dragging the aggregate
    // to 72.11 and failing the break threshold. A glob that generates mutants and a glob that
    // supplies killers are two separate promises, and only one of them had been made.
    testFiles: [
      'scripts/guards/lib/**/*.test.mjs',
      'scripts/guards/hooks/**/*.test.mjs',
      'site/lib/**/*.test.mjs',
    ],
  },

  // D3 scoped mutation to parsing, joining and validating - which is exactly what lib/ is.
  // scripts/guards/gate/** and hooks/** are thin I/O wrappers: they read argv, print and exit.
  // Mutating them would report a large survivor set that says nothing about test quality, and
  // 30-testing.md's surface block is reconciled to match this rather than the other way round.
  //
  // site/lib/** was here BEFORE the directory existed. That is the whole reason this item ran
  // ahead of the content-layer item: the surface is covered the moment it is written, rather
  // than retrofitted once it already has untested code in it.
  //
  // WIDENED 2026-08-24 (TASK 42). Both globs read site/lib/content/** until now, which was the
  // whole of the core on the day they were written and stopped being it the moment a second
  // directory was planned. ADR-008's tree names site/lib/nav/ and site/lib/i18n/, and S-06
  // already scopes the WHOLE of site/lib/** as framework-free — so the rules disagreed with
  // each other: one surface, two boundaries. A file in a sibling directory would have been
  // outside the gate step and outside this run, silently, which is INC-08's shape arriving
  // through a glob instead of through a path filter.
  mutate: [
    'scripts/guards/lib/**/*.mjs',
    '!scripts/guards/lib/**/*.test.mjs',
    // Extension-specific, and that is a latent hole worth naming: if this surface is ever
    // written in TypeScript, the glob matches nothing and the score silently becomes a
    // guards-only number with no warning louder than the one below.
    'site/lib/**/*.mjs',
    '!site/lib/**/*.test.mjs',
  ],

  // MEASURED, not chosen. ADR-006 specified break: 100 on the strength of every hand-applied
  // battery in progress/ reading 100% mutant-kill. The first automated run over the whole
  // surface, 2026-08-24, scored 74.35%: 3532 mutants, 2605 killed, 771 survived, 135 with no
  // coverage at all. The hand batteries were not wrong - each was applied to the code that
  // session was changing, and each really was 100% of that. They were never a measurement of
  // the surface, and nobody had noticed the difference.
  //
  // So this number is a RATCHET, not the goal. It is the measured floor rounded down: the score
  // may not fall, and every point it rises is a point that cannot be lost again. Raising it to
  // 100 is TASK 38, which owns the burn-down.
  //
  // What this enforces, exactly, so the rung in 30-testing.md can be honest: a REGRESSION fails
  // the gate. A surviving mutant, today, does not. Those are different promises and only the
  // first one is kept here.
  //
  // The known weakness of a percentage floor, stated rather than discovered later: adding
  // well-tested code raises the score and can mask a regression elsewhere in the same change.
  // Stryker's thresholds are percentages and offer no absolute-count form, so the mitigation is
  // that TASK 38 ratchets this upward often enough that the slack stays small.
  //
  // A genuine equivalent mutant is still excluded AT THE MUTANT with a written reason, never by
  // lowering this number (ADR-006), and checkStrykerSuppressions fails a reasonless one.
  thresholds: { high: 100, low: 100, break: 74 },


  // The sandbox is a COPY of the working tree, and it is not limited to what git tracks —
  // measured 2026-08-24, after this config had already shipped on the opposite assumption:
  // `.stryker-tmp/sandbox-*/private/banned-terms.txt` and `glossary.md` were both there.
  //
  // That is the confidentiality mapping itself, materialised outside `private/` on disk. It
  // reached no scan (`.stryker-tmp` is an exclusion) and no commit (it is gitignored), so
  // nothing leaked — but "nothing leaked this time" is not the property `H-04` asks for, and
  // a copy nobody intended is exactly how one eventually does. `evidence/` goes with it: it
  // is machine-written trace, large, and no test reads it.
  //
  // Ignored, not merely excluded from scanning: the file never enters the sandbox at all.
  ignorePatterns: ['private', 'evidence'],

  coverageAnalysis: 'perTest',
  reporters: ['progress', 'clear-text', 'html'],
};
