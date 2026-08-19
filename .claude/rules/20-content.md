# Content rules — confidentiality and factual integrity

The `C-*` surface. It governs everything publishable: `resources/**`, the site once it exists, the GitHub profile README, and anything derived from them.

**Loaded always, not path-scoped.** Two of these — `C-05` and `C-06` — apply to every file in the repository, not only to content. Scoping them to `resources/**` would recreate the exact gap found in `check-terms.sh`, whose hardcoded path roster left `docs/` unguarded.

Most of this repository's completed work is content, and three of the eleven transcribed incidents are native to it. These are the rules with the shortest distance between the rule and the damage.

## Factual integrity

| id | rule | rung | origin |
|---|---|---|---|
| **C-01** | **Never present an unmeasured number as measured.** When a figure is needed and does not exist, write `[NEEDS INPUT] <specific question>. Why it matters: <one line>.` **Do not fill the gap with a plausible estimate.** A missing number is fine; a wrong one is disqualifying in an interview. | 2 (`[NEEDS INPUT]` is grep-able) · 4 for the judgment | **INC-09** · a ~70% cost-reduction *target* and its latency figures were published as achieved results. The rollout never completed, so no measured number exists or ever will |
| **C-02** | **Describe what was built, never what was designed.** A plan that was approved and not executed is described as a plan. A capability designed and never implemented is not a capability. | 4 | **INC-10** · a case study described "database per tenant"; the real implementation was one shared database for all 14 tenants, with the per-tenant path designed and never built |
| **C-03** | **A correction propagates to every derived page in the same change.** A fact corrected in a case study is corrected everywhere it was cited — both locales, every page. | 4 | **INC-09** · the error had already reached `home.{en,es}.md` and `about.{en,es}.md`, which cited it as completed fact. Six files, one root cause |
| **C-04** | **Every claim is traceable** to a case study, the CV, or the author directly. Nothing is asserted because it sounds right. | 4 | existing practice · TASK 2 acceptance |

## Confidentiality

| id | rule | rung | origin |
|---|---|---|---|
| **C-05** | **No term from `private/banned-terms.txt` appears in any publishable file.** The check runs over the whole repository, minus an explicit exclusion list — never over a roster of paths. | 2 · `check-terms` in the gate | existing practice · `P-13`, after the path-roster gap found in the original script |
| **C-06** | **These categories are never published, under any framing:** database schemas, table or field names of authentication or financial systems · encryption details, queue names, internal service names, repository names · vendor contract pricing in absolute terms (ratios and percentages are fine) · named security vendors (identity providers, liveness detection, fraud tooling) · unreleased roadmap or internal business strategy · personal contact details of third parties. | 4 | existing practice · `C-05`'s term list catches the names someone thought of; this catches the ones nobody listed. The list is the roster, the categories are the property (`P-13`) |
| **C-07** | **If a task would require breaking `C-05` or `C-06` to be useful, stop and say so.** Do not find a workaround. Confidentiality is a design constraint of this portfolio, not an obstacle to route around. | 4 | existing practice · most of this experience comes from a regulated bank |
| **C-08** | **Diagram ids derive from the public slug, never from an internal product or system name.** The id becomes a public asset path. | 4 | existing practice |

## Craft

| id | rule | rung | origin |
|---|---|---|---|
| **C-09** | **Locale parity is a hard rule.** Never modify one locale without modifying the other in the same change. The Spanish is not a translation artifact — it is first-class content and should read as natively written. | 2 · `check-content` | existing practice · the guard named here did not exist until step 12's acceptance run found the claim unbacked |
| **C-10** | **Evidence over adjectives.** No "passionate about technology", "results-driven", "problem solver". Show decisions, trade-offs, constraints and outcomes instead. | 4 | existing practice |
| **C-11** | **Trade-offs are stated in both directions.** Every decision costs something; naming the cost is the seniority signal. | 4 | existing practice |
| **C-12** | **Every case study ends with "What I would do differently"**, containing a real, specific, self-critical item — not a humblebrag. | 4 | existing practice |
| **C-13** | **English at B2–C1 register**, plain and direct. Flat technical English reads more senior than ornate English. Simple past for completed work, consistently. | 4 | existing practice |
| **C-14** | **Naming and frontmatter are fixed:** `slug.{en\|es}.md`, both locales sharing the same `slug` — that is the i18n join key, and a pair declaring two slugs cannot be joined. **Five keys are universal** — `slug`, `lang`, `type`, `title`, `confidentiality` — and the rest are **required by `type`**, which the config carries. An unknown `type` is a finding, not a pass. | 2 · `check-content` | existing practice · **corrected in step 12**: the row previously named thirteen flat keys, a list no file in `resources/` satisfies — the eight pages carry five. A rule no artifact satisfies is a rule that gets disbelieved, and one disbelieved rule discredits the registry |

## The professional thesis

| id | rule | rung | origin |
|---|---|---|---|
| **C-15** | **Every page reinforces the professional thesis**, stated once as project identity in `CLAUDE.md`. Do not dilute it into generic "backend / distributed systems" positioning. When a piece of content does not connect to it, that is the finding — not a reason to broaden the thesis. | 4 | existing practice · it is the differentiator, and the one thing a reader should retain |

The thesis text itself lives in `CLAUDE.md` because it is *what this project is*, not a constraint on it. This row is the obligation it creates. Both are always loaded, so the split costs nothing to read and keeps one copy of the sentence.
