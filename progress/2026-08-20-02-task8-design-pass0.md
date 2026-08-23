# 2026-08-20 · Session 02 — Design canvas, pass 0 (direction)

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

Ran the `design` skill against `docs/design/claude-design-brief.md`, but ahead of the brief's own two-pass plan (pass 1 = screens 1–4, pass 2 = screens 5–9) inserted a **pass 0**: three direction options on identical real content, published as one Claude Design canvas, before any of the 17 real artboards get built. The brief itself asks for alternatives on type pairing, accent and metadata treatment rather than a silent pick — pass 0 is that fork made concrete instead of described in prose.

Canvas published: https://claude.ai/code/artifact/890abe00-2817-4bc8-bd8c-6fc9dc887f6b — three artboards (**A · Journal**, **B · Grotesk**, **C · Specification**), each rendering the same verbatim slice of real content (dateline, thesis line, first Evidence bullet with its metric, the full `otp-provider-decoupling` metadata block including the long honest `outcome`, a bold lead-in paragraph, a pull quote, the `What I would do differently` block, and a redrawn `otp-c4-before` diagram fragment), with a light/dark toggle tweak on every artboard.

## Decisions

- **A direction-only pass precedes the two-pass screen plan**, adopted after the author's own steer during checkpoint. Building 8 screens (pass 1) against an undecided type system risks redoing all 8 if the direction changes — `P-09`'s "an agent cut off mid-run delivers zero, not half" logic applies to a wrong-direction build too, just paid at commit time instead of turn-budget time.
- **Dark mode is required, not a recommendation with a cost attached** — corrected mid-session by the author from this session's own first draft, which had proposed light-only as the default position. Every direction now ships light and dark tokens and a live toggle. **Production mechanism: `prefers-color-scheme`, zero JavaScript, no manual toggle control in the chrome** — this reconciles "dark mode is not optional" with the brief's explicit stance against a toggle switch (`ADR-001`'s zero-JS default already rules out a JS-driven toggle; a CSS-only toggle has no clean implementation for a static multi-page site). Recorded in `docs/design/canvas/README.md` so it survives past this session.
- **The accepted direction's design source stays in the repo; the seeded, editor-baked canvas HTML does not.** `docs/design/canvas/src/*.dc.html` (the actual authored design — type pairing, palette, diagram tokens) is real content and is tracked. The ~2.3MB payload the design skill bakes per publish is a means of viewing/editing it, not the design itself, and stays out of git — analogous to not committing a compiled binary next to its source. The Claude Design Artifact URL is the durable, editable location for that.
- **Font-expansion intermediates (`build/`, `.fonts/`) are gitignored and excluded from `check-terms`**, added to `scripts/guards/guards.config.json`'s exclusion list alongside `node_modules` and `evidence/runs` — same shape: third-party binary content, regenerated on demand, not authored. Verified this was necessary rather than assumed (`P-04`): the first gate run failed `check-terms` on 5 base64 font blobs in `build/`, masked but real findings, not noise.
- **`build.mjs` fetches its own fonts** rather than depending on a manually-curled cache. Verified by deleting `.fonts/` and `build/` and re-running from nothing — 7 files re-fetched from Fontsource's CDN, build succeeded. This was a mid-session correction to the original design (which assumed a pre-populated cache); a script that only works because a human ran curl commands first is not reproducible for the next session.

## Findings from validating against real state (P-04)

- **Fontsource's non-variable path 404s.** `<id>@latest/latin-wght-normal.woff2` fails; the correct path is `<id>:vf@latest/...`. Verified with `curl -I` against all 7 fonts before writing any code, not assumed from memory.
- **IBM Plex Mono has no variable build on Fontsource** — static per-weight files only (400, 500 used). Direction A's metadata/mono treatment accounts for this: two static weights, not a variable axis.
- **`check-terms.sh` scans the whole working tree regardless of `.gitignore`** — gitignoring `build/` was not sufficient on its own to keep the gate green; the exclusion had to be added to `guards.config.json` explicitly. Worth remembering for any future generated-intermediate directory.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/canvas/README.md", "progress/2026-08-20-02-task8-design-pass0.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 191 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 steps PASS; check-trace FAILS on evidence/runs/2fc08374.../orchestrator.jsonl seq 61, a tool.result with no matching tool.requested"], reason: "the failure is TASK 12's pre-existing scope (trace-writer correlation bugs, GAP-03 family) — H-03 forbids editing evidence/ to paper over it, and fixing the hook writer is out of scope for a design/UX session" }
  scope:      { status: passed, evidence: ["one deliverable: the pass-0 canvas + its source, README and this log; pass 1/2 deliberately not started"] }
  loose_ends: { status: passed, evidence: ["direction choice and its record-in-repo are the explicit next step, not left as prose"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched (scripts/guards/**, site/lib/content/**); guards.config.json is data read by an already-tested guard, and the existing check-terms suite (378 tests, still 0 fail) covers the exclusion mechanism as a property" }
  mutation:   { status: not_applicable, reason: "same as tests — no new guard logic" }
  security:   { status: not_applicable, reason: "no boundary, guard behavior or permission changed; the guards.config.json edit adds exclusion data to an existing, already-tested mechanism" }
  iterations: { status: passed, evidence: ["2", "first draft proposed light-mode-default dark-mode-optional and a pre-cached-fonts build.mjs; both corrected the same session on author/self review before publish — see Decisions"] }
```

## Open questions

- **Which direction?** Author reviews the canvas and picks A, B, C, or asks for a recombination (e.g. Journal's mono metadata block with Grotesk's diagram node style). Blocks pass 1 — the 8 screens build against whatever wins here.
- **Do the two rejected directions stay on the canvas** (e.g. moved to a `Rejected` page) once one is picked, or get deleted from `src/`? Author's call, noted in `docs/design/canvas/README.md`'s "Once a direction is accepted" section — not decided here because no direction is accepted yet.

## Next

1. **Author picks a direction** (or a recombination) from the published canvas.
2. **Record the decision in the repo** — a new file under `docs/design/decisions/` naming the chosen direction, the resolved type pairing/palette (light + dark tokens), and the diagram visual-language spec the `otp-c4-before` fragment established. This is the step the author specifically asked to not lose to chat memory.
3. **Pass 1**: `src/` grows artboards for screens 1–4 (home, `otp-provider-decoupling`, case-studies index, platform anchor page) desktop + mobile, in the accepted direction, plus a `home.es` desktop artboard as the Spanish-length stress test. `canvas.json` gains a `Screens` page and the `launch` view moves to it.
4. `TASK 6` (hand-authored diagrams) stays blocked until the diagram visual language is locked by the accepted direction — unchanged from before this session.

## Files changed

`docs/design/canvas/src/Main.dc.html` — new. Direction A (Journal): Newsreader / IBM Plex Sans / IBM Plex Mono.
`docs/design/canvas/src/DirectionB.dc.html` — new. Direction B (Grotesk): Space Grotesk / Literata.
`docs/design/canvas/src/DirectionC.dc.html` — new. Direction C (Specification): Source Serif 4 only, small-caps metadata.
`docs/design/canvas/src/canvas.json` — new. Artboard layout and the motivation/tradeoff annotation for each direction.
`docs/design/canvas/build.mjs` — new. Expands each artboard's font marker into inline base64 `@font-face`, self-fetching from Fontsource's CDN.
`docs/design/canvas/README.md` — new. How to re-seed, republish, and what happens once a direction is accepted.
`.gitignore` — added `docs/design/canvas/.fonts/` and `docs/design/canvas/build/`.
`scripts/guards/guards.config.json` — added both paths to `exclusions.paths`, each with a reason.
`TASKS.md` — TASK 8 status line updated to point at the published canvas and this log.
