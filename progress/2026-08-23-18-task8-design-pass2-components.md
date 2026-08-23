# 2026-08-23 · Session 18 — The component sheet, the phone frames, and the end of the desktop set

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS — the design pass is done; the backlog it exists to inform is not written yet

The author approved the previous round and asked to continue. This closes pass 2 and, with it, `TASK 8`'s design deliverable: **eleven live artboards, ten pages and one document.**

## The component sheet — an inventory, taken last on purpose

Held back for two rounds, and the reason was not budget. **A sheet is an inventory, and an inventory taken before the set closes has to be taken twice.** Three components arrived after the first six screens were approved — the language switcher, the link row, and the severed-seam motif. Assembling in round 16 would have guaranteed a re-assembly in round 18.

Fifteen groups (fourteen at first — the logo slot arrived from the author's review), each carrying three things: the class name, the states, and — the part that actually matters at implementation — **what content the component is handed.**

That third column is the fourth breakdown constraint made concrete. `TASK 8` says every list on the site is expected to grow and every one must render from content files; a sheet that showed only how a tile *looks* would have documented the half nobody gets wrong. So each group has a `takes:` line, and the tile's says the thing out loud: **a sixth case study must be a new pair of `.md` files and nothing else, and the motif is a per-instance prop rather than a hardcoded child.**

Two presentation decisions worth keeping:

- **Both themes at once, side by side**, wherever the palette is the point — rather than asking the reader to toggle and remember what the other one looked like. It needed one CSS trick: `.board[data-theme]` is specificity `(0,2,0)`, so a bare `.t-light` at `(0,1,0)` loses to it inside a dark board. The descendant form `.board[data-theme] .t-light` is `(0,2,1)` and wins in both directions.
- **Interaction states frozen with an `is-` class.** A sheet cannot hover, and a specimen that only shows its resting state documents the easy half.

### The contact form's four states — the one piece of new design here

Everything else on the sheet is an inventory of something that existed. The form states did not exist, and they are the only place on the site where an action can fail.

Two rules do the work, and both are stated on the sheet rather than left in the CSS:

- **On success the form is gone.** An emptied form sitting beside a success message is an invitation to send the same thing twice, and the second copy always looks worse than the first.
- **On failure the contents survive and a second channel is named.** A failed send that also loses what someone wrote costs them the message twice — and by then they are not writing it again. The fallback address is part of the error state, not a consolation somewhere else on the page.

`sending` blocks rather than only dims: the visual state and the disabled state are the same fact, so they are one class rather than a class plus a hope.

The backend is still undecided — a Cloudflare Worker per `ADR-004`, or a plain `mailto:`. **These four states are the same either way**, which is precisely why they could be designed now instead of waiting for that decision.

### Section 13 is the one `TASK 6` should read

The motif vocabulary — strata, nodes, channel, severed channel — with the constraint that produced it stated explicitly: **stroked geometry, never glow or gradient, because a stroke survives both themes without being redesigned and a glow looks right in dark and falls apart in light.** That one constraint is why the hero, every tile motif and the eleven diagram replacements can share a single visual language instead of three. Shown in both themes, unchanged, to make the claim checkable rather than asserted.

## The phone frames — derived, not copied

Two frozen 390px artboards, `HomeMobile` and `CaseStudyMobile`. **Two archetypes, not all eight screens**: home (hero, bento, marquee) and the article (the disappearing table of contents, the stacked masthead, the overflowing diagrams). Every other screen is one of those two shapes, so a third frame would document nothing new.

The board is `width: 100%`, so a 390px artboard frame genuinely fires the narrow media queries. This is the real state, not a scaled-down picture of the wide one.

**They are byte-identical to their desktop sources, and generated.** That was the whole question worth thinking about: a duplicated 750-line file in `src/` is a maintenance liability, and a phone frame that has drifted from its source documents a screen that does not exist. Hand-maintaining a copy guarantees it diverges — silently, in the direction nobody is looking.

So `docs/design/canvas/derive.mjs` writes them, they carry a `GENERATED … do not edit` banner, and **`verify.mjs` re-runs the derivation in memory and fails if a checked-in file differs.** Drift is not discouraged here; it is impossible. Proven in red: hand-edit one word in `HomeMobile.dc.html` → `FAIL … differs from derive.mjs output`, exit 1.

## `home-es.mjs` moved out of the scratchpad, which it should never have been in

The generator producing a **checked-in** file had been living in the session scratchpad, regenerated from memory each round. That is a cache treated as a source of truth (`P-10`), and it is the same class of mistake as `verify.mjs` last round — I made it twice, one round apart.

It is now `derive.mjs` in the repository, handling all three derived artboards, exporting `derive()` so `verify.mjs` calls it directly rather than shelling out, and documented in the canvas README with a table saying **why each derived file must be identical to its source** — because the reason differs per file, and "it's a copy" is not a reason anyone can act on.

## Page versus document — a distinction the checks needed

The component sheet broke three of `verify.mjs`'s checks, and each break was informative rather than annoying:

- it has **no rail**, so the language-switcher and rail-collapse checks failed;
- its prose **quotes the no-counts rule** — *"'five case studies' is wrong the day a sixth lands"* — so the count check failed on documentation explaining the very rule it enforces.

The lazy fix is a per-file exception list, which is exactly the roster anti-pattern `P-13` names. The real fix is a distinction that was already true and had never been written down: **a page has a rail.** It is somewhere you can *be* on the site, so it owes the reader navigation, a locale switch, and copy that behaves like copy. A document has no rail because there is nowhere to navigate to from a specimen, and its prose is *about* the site rather than *of* it.

One property, derived from the artboard, scoping three checks. `verify.mjs` now reports the split (`10 pages + 1 document(s) live`) so the classification is visible rather than implicit.

## Author review — logo slots, and a confirmation that talked about itself

### The logos

*"sobre los employers y el stack en Home… y en experience… va el logo de la empresa… debería ir en los cards"*

Correct, and it was a genuine omission: three placements had no slot at all. They exist now, sized, visible, and on the live screens rather than only in the sheet &mdash; home employer card (32px), Experience entry (38px, which has the column width), home stack strip (18px).

**One rule governs all three, and it is the reason a missing logo never becomes a design problem: the logo is layered on a wordmark that already reads, never a replacement for it.** An employer whose logo nobody can find is not a hole. A technology without a usable mark keeps its dot. Neither case needs a decision when it happens.

Two consequences worth having written down:

- **The slot is a fixed box, not a natural size.** A row of logos at their own dimensions has no optical baseline; the box is what gives it one.
- **A placeholder is legible in a static list of four and reads as breakage in a moving strip of fifteen.** So the employer cards show visible dashed slots, and the marquee keeps its dots on the live screen — the dot *is* the no-logo state, `.dot` renamed to `.mark` to say so, with `.mark.has-logo` as the 18px form.

`C-06` still binds and is stated on the sheet, because this is exactly where it would be forgotten: **no named security vendor gets a mark** — no identity provider, no liveness or fraud tooling, no OTP provider, not as a logo and not as a label. The four employers are already public in the frozen content; those vendors never are.

Sourcing the files is **unowned work** and carries a per-mark licensing question a design cannot answer. Declared as a gap rather than assumed away.

The change to the employer markup broke `derive.mjs`'s substitution table, which is the assertion working: `HomeES` failed to generate rather than silently shipping an English fragment.

### The confirmation

*"no me gusta el mensaje que se da una vez se envía el correo… mucha vuelta… más directo (no interesa de donde lo leo, ni si tiene ticket, ni autoresponder)"*

Right, and shortening it also found the better version. The old copy explained the inbox, the absence of a ticket number and the timezone — **a confirmation talking about itself**, and none of it the sender's problem.

Two lines now, and the second one is load-bearing rather than merely shorter:

```text
Sent.
I'll reply to alex@northbank.com.
```

**Once it has sent, the only thing that can still be wrong is where the reply goes** — so the state echoes back the address that was typed, and says nothing else. A typo becomes visible at the one moment the sender can still do something about it.

## Verification

| Dimension | Status | Evidence |
|---|---|---|
| Structural properties | passed | `node docs/design/canvas/verify.mjs` → PASS, 15 artboards, 10 pages + 1 document, 10 annotations, 8 properties |
| Drift is impossible | passed | red/green cycle: hand-edit `HomeMobile.dc.html` → FAIL + exit 1; `derive.mjs` → PASS |
| Derivation is idempotent | passed | `derive.mjs --check` → ok, 3 derived files match; `HomeES` unchanged by the move, confirming the table survived intact |
| Canvas seeds | passed | `seed-canvas.mjs --check` → ok, 16 files, clean stderr |
| Confidentiality | passed | `./scripts/check-terms.sh` → PASS, 33 terms × 224 files |
| Docs current | passed | canvas README: derived-artboards section, the page/document distinction, the eight properties with scopes, and the stale status line at the top corrected (`P-07`) |
| Gate | **partial** | 8/9 PASS. `check-trace` FAILs on the pre-existing `TASK 12` correlation gap; `H-03` forbids writing to `evidence/` |
| Rendered by a browser | **not done** | no headless browser in the repo until `TASK 15` installs Playwright |

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/canvas/README.md — status line corrected, derived-artboards section, page/document distinction, 8 properties with scopes", "canvas.json — note-components and note-mobile", "TASKS.md — TASK 8 status line"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 224 files", "C-01/C-04: the testimonial and photo specimens carry [NEEDS INPUT] and name the task that resolves them, rather than showing plausible stand-ins", "C-15: section 13 states the motif vocabulary as the thesis's visual form"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the pre-existing TASK 12 tool.result/tool.requested correlation gap"], reason: "H-03 forbids editing evidence/; TASK 12 owns the fix" }
  tests:      { status: passed, evidence: ["verify.mjs — PASS, 8 properties, all derived from the artboards (P-13)", "derive.mjs --check — 3 derived files match their sources", "seed-canvas.mjs --check — ok, 16 files"] }
  scope:      { status: passed, evidence: ["the sheet covers every component on every screen, not the memorable ones; the phone frames cover both archetypes; the page/document split was solved as a property rather than an exception list", "the logo slots went onto the three LIVE screens, not only into the sheet — the author asked where they belong, and answering only in documentation would have left the screens still missing them"] }
  loose_ends: { status: passed, evidence: ["home-es.mjs moved out of the scratchpad into derive.mjs — the P-10 violation from last round, found and closed", "what is left is named below and every item has an owner"] }
  mutation:   { status: not_applicable, reason: "no mutation-covered surface touched — the canvas is design source, not shipped code" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["2"] }
```

## The design deliverable is done. `TASK 8` is not.

**Every screen the brief called for now exists**, plus three the brief did not: the Spanish stress test, the bilingual 404, and the component sheet. The design work `TASK 8` was blocked on is finished.

**What `TASK 8` still owes is the backlog itself** — the work items the site's implementation is cut from, sized against the page set the structure decision fixed (`docs/design/decisions/2026-08-22-site-structure.md`) rather than against the brief's original nine-screen inventory. That is the deliverable, and it has not been written.

## Carried forward, each with an owner

| Item | Owner |
|---|---|
| Real LinkedIn recommendations — text, name, title, permalink, both locales | `TASK 19` |
| The About/Experience content split and three photographs | `TASK 20` |
| Diagram legibility at published width, both themes | `TASK 6` |
| The `Get in touch` copy change, the Experience `h1` and intro, per-role stack lines — all of it a `resources/` edit | `TASK 20`, blocked here by `H-02` |
| Rendered visual QA: dev vs prod vs design intent, as three distinct comparisons | `INC-03`'s item, to be created by this breakdown |
| Playwright, and with it any screenshot-based check | `TASK 15` |
| The contact form backend — Worker per `ADR-004`, or `mailto:` | an implementation item, to be created |
| Real vendor logos for the marquee, if ever | unowned, and deliberately so — the typographic version may simply be better |
