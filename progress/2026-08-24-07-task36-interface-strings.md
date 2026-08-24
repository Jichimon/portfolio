# TASK 36 — Interface strings as content

**Date:** 2026-08-24
**Type:** `content`
**Ran:** eighth in the site sequence, ahead of the content layer and the layout shell

## Why this ran now

Every visible string the site's chrome prints — nav labels, the rail's role/location/timezone block, `On this page`, `← Work`, the EN/ES switcher, the theme toggle, the article masthead labels, the footer, the 404 — **existed nowhere in `resources/`.** Verified against all 20 content files, not assumed.

`S-01` forbids any one of them being typed into a template. So the layout shell could not be built without either breaking the first implementation constraint or waiting for this file. It waits here instead, where it costs one author paste rather than three.

## Scope: derived, not enumerated

The work item's body lists the strings it had in mind. That list is a roster, and `P-13` says derive the property instead. The register already carries the property, in criterion 4's declaration-site table:

> Nav **labels**, and every other visible chrome string → `resources/site/ui.{en,es}.md`

So the rule applied was: **a string belongs here when a template prints it regardless of which content file is loaded.** That pulls in the article masthead labels, the two page labels, the About byline labels, the home section headings and the contact form — none of which the body enumerated, all of which would otherwise have been typed into a template by the item that needed them first.

The author confirmed the wider reading, and confirmed including the contact form's strings even though the form is not built at launch.

## Shape

Frontmatter, nine groups, one group per template. Not the body.

The body is **not empty**: it carries the traceability record — every string, its artboard, its line — which is what makes the `Done` criterion (*every string traceable to an artboard*) checkable by a reader instead of asserted. Nothing renders it.

Three shape decisions worth their own line:

- **The 404 loads both locales of this file at once.** Its design shows English and Spanish side by side, so its template reads `ui.en.md` **and** `ui.es.md`. That is the case that justifies the chrome being a joinable collection rather than one module per locale.
- **`not_found.status_code` and `status_word` are split**, because the artboard prints one line — `HTTP 404 · not found · no encontrado` — composed from both locales. Carrying the whole line in both files would be one datum declared twice, which is what criterion 4 exists to prevent.
- **`nav` carries labels only.** Which items exist, their order, their target and their `soon` flag are structure and belong to the site's own core. The line is drawn by what the thing *is*, not by what is convenient.

## The Spanish

Most of it already existed. `HomeES.dc.html` carries the full nav including `pronto`, the timezone line, `Modo oscuro`/`Modo claro`, the four home section headings, the contact invitation and note, the entire form and the footer; `NotFound.dc.html`'s Spanish half carries the 404's heading, body and four destinations. All lifted verbatim.

**Sixteen strings existed in no artboard** and were written for this file — no artboard has the Spanish half of the article, About or Experience pages. They are listed one by one in `ui.es.md`'s own body, with their English reference beside them, so the author reviews them individually rather than approving the file in bulk (`C-01`, `C-04`).

**Two need a decision rather than a review**, and say so in the file:

- `article.deep_dives` — left in English. *Deep dives* is a term of art and the literal Spanish loses the "children of this platform" sense. Candidate if the author prefers translation: *En profundidad*.
- `article.platform_tag` — left mixed (*Plataforma · raíz de los deep dives*), carrying the same term inside a Spanish phrase.

`article.stack` stayed **Stack**: it is the word the industry uses in Spanish, and translating it to *Tecnologías* would collide with `home.stack_heading`, which already reads *Tecnologías con las que trabajé*.

## The guard change

`scripts/guards/guards.config.json`, `content.byType`:

```json
"ui": ["nav", "rail", "home", "article", "about", "experience", "contact_form", "footer", "not_found"]
```

Without it `check-content` reports `declares type "ui", which has no required-key set` and the gate fails — the correct behaviour, and why the line lands in the same change as the files.

**The split between the two validation levels is written into `_byTypeRationale`, not left implied:** `check-content` is rung 2 and asserts the nine groups exist, because `parseFrontmatter` is a key scanner rather than a YAML parser, deliberately. Leaf-by-leaf validation belongs to the collection schema at build time. Each level claims exactly what it covers (`G-11`).

Edited through a script that validates `JSON.parse` **before** overwriting. That is a direct consequence of the previous item, where a bad escape in this same file locked every tool call out under `G-13`.

## Verification before the author pasted anything

Three checks run against the drafts while they were still outside `resources/`, because a defect found after the paste costs a second round:

1. **The real guard functions, not a reading of them.** `checkParity` and `checkFrontmatter` imported from `scripts/guards/lib/content.mjs` and run over the two drafts with the real config: **no findings, 9/9 required groups present in each.**
2. **A real YAML parser**, since the guard's is deliberately not one. Both files parse; **63 leaf strings each; the key shapes are identical**, so every string has a counterpart across locales (`C-09`) — a property the guard cannot see, because it only checks that both files exist.
3. **`check-terms` over the real repository** with the drafts temporarily copied into it: **PASS, 33 terms × 256 files.** The temporary copy was removed in the same command.

## Findings recorded for later items

Five gaps this item's exploration surfaced. None blocks it; three block wave B, and finding them now beats finding them with an agent mid-run (`P-06`).

1. **The home employers strip has no structured source.** The artboard prints four employers with names and years; `experience.{en,es}.md` is prose. Nothing in `resources/` holds that as data.
2. **The technology marquee is derivable but needs a dedup rule.** All fifteen artboard chips are in the union of the five case studies' `stack` arrays — but that union holds twenty distinct values with overlaps and two the design dropped. The artboard's fifteen are a curated subset.
3. **`scale` is one string; the artboard splits it in two.**
4. **`skills` has no label in any artboard.** Render it unlabelled or not at all — inventing a label is inventing design.
5. **About's `h1` exists in no content file.**

## A duplication worth naming

`rail.role` / `rail.location` / `rail.timezone` state the same facts as `home.{en,es}.md`'s opening dateline, in a different shape — the rail's three-part block appears on every page, the dateline only on home. Two declaration sites for one fact, which `C-03` makes the author's problem to keep in sync and nothing mechanizes. Recorded rather than resolved: merging them would mean the rail reading home's body, which the gateway boundary forbids.

## done

```yaml
done:
  content:    { status: passed, evidence: ["resources/site/ui.en.md and ui.es.md, 63 leaf strings each, nine frontmatter groups one per template", "check-content 22 file(s) / 10 locale pair(s), up from 20 / 9 - the pair entered as a pair, which is the delta that proves it", "every string traceable: each file body carries the artboard and line it came from, which is what makes the Done criterion checkable by a reader instead of asserted"] }
  locale_parity: { status: passed, evidence: ["both locales written and copied in the same change (C-09)", "a real YAML parser confirms IDENTICAL key shapes across the two files - 63 leaves each, zero keys present in one and absent in the other. check-content cannot see this: it asserts both files EXIST, not that their contents correspond"] }
  factual_integrity: { status: passed, evidence: ["every English string lifted from an artboard in docs/design/canvas/src/, nothing invented (C-01, C-04)", "sixteen Spanish strings existed in no artboard and are listed individually in ui.es.md's own body with their English reference, so they are reviewed one by one rather than approved in bulk", "two flagged as DECISIONS rather than reviews - whether Deep dives is translated, and the phrase carrying it - because a translation choice for a term of art is not an agent's to make silently"] }
  confidentiality: { status: passed, evidence: ["check-terms PASS, 33 terms x 257 files", "run BEFORE the author pasted: the drafts were copied into a temporary directory inside the repository, scanned, and the directory removed in the same command - a banned term found after the paste costs a second round"] }
  tdd:        { status: not_applicable, reason: "work-item type content, per T-01's type table. Declared out loud because silence reads as coverage (P-03)" }
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs via the gate - 465 pass, 0 fail. The config change is the only executable surface this item touched", "the drafts were validated against the REAL guard functions imported from scripts/guards/lib/content.mjs, not against a reading of them: checkParity and checkFrontmatter over both files with the real config returned no findings, 9/9 required groups present in each"] }
  mutation:   { status: passed, evidence: ["74.98 global over scripts/guards/lib/**, break 74 - measured on this item's own final run, not carried over from the previous one", "no file under the mutated surface (scripts/guards/lib/**) was touched by this item - the change is one config entry and two content files"] }
  gate:       { status: partial, evidence: ["15 of 16 steps PASS on the final run", "two intermediate runs failed and were fixed rather than waived: the first at 14/16 on this log's own missing done block, which check-procedures caught exactly as designed"], reason: "check-trace FAILS on two broken tool.requested/tool.result correlations at seq 303 and 321 - and this time inside THIS session's own trace directory, not a stale one. It is TASK 12's known writer defect, reproducing on a live run rather than surviving in old data. It cannot be cleared here: evidence/** is hook-written and rung-1 read-only to every agent (H-03), and the directory holds this item's own evidence, so deleting it would destroy what the trace exists to prove. Closing partial with the owner named is the precedent TASK 21 and TASK 31 already set - inventing green is the one option not available" }
  security:   { status: passed, evidence: ["resources/** never written by an agent (H-02): both files were drafted to the session scratchpad and the author copied them, and the copies were verified byte-identical against the drafts afterwards", "evidence/** untouched (H-03) - read only, to identify the trace defect above", "no git write (H-01); git used for reads only", "guards.config.json was edited through a script that runs JSON.parse BEFORE overwriting, a direct consequence of the previous item locking every tool call out under G-13"] }
  docs:       { status: passed, evidence: ["check-docs PASS - 53 documents, 189 path references resolved, 6 reasoned exemptions. The count rose by one because the register now cites this log, and check-docs proves that citation resolves", "guards.config.json _byTypeRationale extended to record WHICH level validates what: check-content asserts the nine groups exist, the collection schema validates leaf by leaf at build time (G-11)", "no docs.ignore entry was needed: the register names the deliverable in brace form, so nothing pointed at these files while they did not exist"] }
  ci:         { status: not_applicable, reason: "no remote exists, so no CI run can be read (T-10). TASK 30 owns it" }
  loose_ends: { status: passed, evidence: ["five findings from this item's exploration were filed INTO the items that already own them rather than as new ids - two rows added to TASK 20 (structured employer entries, the About h1), two constraints to TASK 24 (marquee normalisation, the absent employer source), two to TASK 25 (the scale split, the unlabelled skills field). Five new ids for work that belongs inside existing deliverables would fragment the register, not track it", "the rail/home duplication of role, location and timezone is recorded in this log as a C-03 hazard rather than resolved: merging them would mean the rail reading home's body, which the gateway boundary forbids"] }
  scope:      { status: passed, evidence: ["one deliverable: every chrome string the site prints, in both locales, as content", "scope was DERIVED from criterion 4's declaration-site table rather than taken from the item body's enumeration, which is a roster (P-13) - the wider reading was put to the author and confirmed, along with including the contact form's strings", "nav STRUCTURE deliberately not included: which items exist, their order, their target and their soon flag are structure and belong to the site core. Only the labels are here"] }
  iterations: { status: passed, evidence: ["2"] }
```

**On `iterations`.** One cycle to draft, validate and hand over the two files; a second forced by the gate, which failed on this log's own missing done block and on `check-trace`. The second is counted because it was a human-visible cycle.

## The trace defect, recorded for `TASK 12`

Worth writing down because it is the first time the defect has been observed on a **live** run rather than found in stale data: two `tool.result` events at `seq 303` and `seq 321` carry a `tool_use_id` that no `tool.requested` in the file matches. Around them the ordinary shape holds — requested, decision, result, three events per call — so this is not general corruption but two specific calls whose opening event never reached the file. `TASK 12` owns the fix; this is an observation, not a diagnosis.
