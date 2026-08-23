# 2026-08-23 · Session 19 — TASK 8 closed: the site implementation backlog

**Task:** TASK 8 — Site work breakdown
**Status after this session:** DONE

The design was finished last session; this writes the thing `TASK 8` actually owed. Eleven items after the author's review — `TASK 21`–`TASK 31`, run in the sequence the backlog's head table gives, not in numeric order.

## Four decisions taken before writing, not during

The author asked for the backlog with *"enfoque corto para no quemar tokens al pedo… y si hay preguntas sin definir, hay que hacerlas"*, and set the new standard explicitly: **finish fast and get it deployed on a Cloudflare domain.**

Four things were genuinely undecided and each one changed the *shape* of the backlog rather than one entry's wording, so they were asked rather than assumed. All four came back as the recommended option:

| Question | Answer | What it changed |
|---|---|---|
| Deploy early or at the end? | **Deploy first** | `TASK 21` is a walking skeleton that is live before any design exists. Deploy risk gets found on day one instead of at the end, and there is a link to show from the start. After the author's review it deploys *via CI*, and `TASK 30` — the GitHub remote — runs ahead of it |
| What does the site do while `TASK 19`/`TASK 20`/`TASK 6` content is missing? | **Omit the section** | No `[NEEDS INPUT]` reaches production. The site looks finished from the first deploy and fills in as content lands, with no code change — the content-driven constraint doing real work rather than being a slogan |
| Contact form backend? | **`mailto:` now, Worker later** | Zero backend, zero secrets, zero spam surface at launch. `TASK 29` carries the Worker with a stated trigger |
| Domain? | **`*.workers.dev` first** | Nothing blocks the first deploy; `TASK 28` connects the real domain once it exists |

They are recorded at the head of the backlog so no later item re-litigates them.

## How the items were cut

**By object, not by surface** (`P-09`). Every entry names the files or routes it owns, so a slice either finishes or fails visibly — never "the components", which is how three surface-sized slices once burned ~301k tokens for 0/3.

**Four criteria are stated once, at the head, instead of repeated eleven times**: content-driven, locale parity, design fidelity, and one-datum-one-declaration. Repeating them per item is how a criterion gets skimmed; stating them as universal is how they get read. (The first draft had three; the fourth came from the author's review, below.)

The one item that deserved its own paragraph is `TASK 22`, the content layer — it is the reusable core the whole site's value rests on, and it also **inherits `ADR-003`'s two open items**, which had had no owner since that ADR was accepted: the in-body link-rewriting mechanism, and whether Astro's i18n fallback fires for collection-driven routes. A decision recorded as open in an ADR and never assigned is a decision that quietly becomes someone's surprise.

## Two boundaries written into the items rather than assumed

- **The author holds every credential and performs every git write.** An agent writes the workflow and the config; the author creates the remote, pushes (`H-01`), and supplies `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets. No Cloudflare credential enters the session environment (`G-08`). Same for `TASK 28`: an agent prepares DNS and route config, it does not purchase, authenticate or transfer.
- **`mailto:` is the shipped answer, not a stopgap** — and `TASK 24` says explicitly: do not build a fake success state that lies. The designed `sent`/`error` states stay unexercised until `TASK 29`, which is honest rather than tidy.

## `TASK 8`'s own constraints, discharged

All four breakdown constraints are answered rather than quietly dropped:

| Constraint | Where it landed |
|---|---|
| A design/UX task owning "what each screen looks like" | Done — eleven artboards and a component sheet, approved across two passes |
| `INC-03`'s visual-QA rigor checklist as its own item | `TASK 27`, and it keeps the part that matters: **three comparisons, not two.** Dev-vs-design alone would have missed `INC-03` exactly as it was missed then |
| Rail position tracking as an acceptance criterion on the nav item | `TASK 23`, including the no-JavaScript fallback |
| Content-driven components on every implementation item | A universal criterion, both halves — markup and copy |

`TASK 6` is unblocked in the same change (`P-07`): its blocker was `TASK 8`, which is now closed. Its trigger is restated — replace incrementally once `TASK 25` renders a diagram in a real page, never as a batch.

## Author review — three corrections, all structural

The first draft had nine items and three real gaps. None was a wording problem; each changed the shape.

### 1 · CI comes first, and it is the only deploy path

*"primero debería existir un item de tarea para subir a github… desde github mediante CI debería existir un github action para subir a cloudflare… deberíamos empezar por eso"*

The draft had `TASK 21` deploying with a manual `wrangler deploy`, with CI never mentioned. Two things wrong with that.

**The repository has no remote yet.** `ADR-005` accepted a public GitHub remote on 2026-08-19 and verified the history clean before deciding — but the push was left as the author's action and never happened. Everything automatable is blocked on it, and no item owned it. That is now **`TASK 30`, running first**, with the constraint that the history is re-verified immediately before pushing rather than trusting a check made in August: a push publishes whatever is there *now*.

**A manual deploy first and CI later is shipping one mechanism and then replacing it** — and the manual one keeps working, so nobody notices when the automated one breaks. `TASK 21` now delivers the skeleton *and* `.github/workflows/deploy.yml` together, and its done is the honest one: **a commit pushed to `main` appears at the live URL with no local command run.** The workflow runs `node scripts/gate.mjs` before deploying, because a gate that only runs locally is a gate that runs when someone remembers.

`G-08` holds in the new shape: an agent writes the workflow, the author creates `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, scoped to Workers deploy on one account rather than a global key.

### 2 · Design verification per item, and the harness has to exist first

*"no veo que cada tarea se haga items de test de comprobación respecto al diseño… eso es muy importante"*

Correct, and the ordering was the real defect. The draft had visual QA as `TASK 27`, **after** every page item — so the first three pages would ship unverified and be retrofitted, which is the more expensive order and the one that quietly never happens.

`TASK 27` **moves ahead of the page items** and becomes the mechanism, not an afterthought. Design fidelity is now criterion 3, universal, and each page item names its own artboards:

| Item | Diffed against |
|---|---|
| `TASK 23` shell | `Components.dc.html` §01–§05, all three responsive states |
| `TASK 24` home | `Main.dc.html`, `HomeMobile.dc.html`, and `HomeES.dc.html` for the Spanish route |
| `TASK 25` articles | `CaseStudyDetail.dc.html`, `CaseStudyMobile.dc.html`, `PlatformPage.dc.html` |
| `TASK 26` about/experience/404 | `About.dc.html`, `Experience.dc.html`, `NotFound.dc.html` |

Two constraints keep it from becoming a test nobody trusts. **A pixel diff on a whole page fails for the wrong reasons**, so the comparison is component-level against the sheet with a tolerance, plus a few full-page structural assertions. And **the artboards are mockups whose content differs from the real content by design** — the comparison is structural and stylistic, never text equality. A fidelity check asserting text equality would fail forever and be switched off within a week.

The author also noted the brief is stale — *"cambios que deberían reflejarse en el brief igual"*. It is, badly: fifteen review rounds changed the contact copy, the count-free rewrite, the logo slots, the confirmation, Experience's `h1`, the switcher, the responsive contract and the 404, and the brief mentions none of them. It is **the input artifact every implementation item reads**, so `TASK 31` reconciles it **before** the pages, not after — reconciling a brief once the pages exist reconciles nothing. Its done is a two-way property check (`P-13`): every screen the brief names exists in `src/`, and every artboard in `src/` is named by the brief.

### 3 · One datum, one declaration site

*"mantener la distribución y/o arquitectura para que cada dato/recurso sea declarada una sola vez y un solo lugar de verdad"*

Promoted to **criterion 4**, with a mapping table rather than a principle — a principle without a table is something everyone agrees with and nobody applies. Copy in `resources/**`; tokens in one stylesheet; the route set derived from the collection; nav items in one data module; diagram assets in `resources/diagrams/`; the alternate-locale URL from the `slug` join.

And the observation that makes it urgent rather than theoretical: **the canvas itself violates it.** Every one of the eleven `.dc.html` files carries its own copy of the token block. That is correct for eleven independent mockups — each has to render alone — and would be a defect in a site. Since implementation *copies from the canvas*, that is precisely the route by which it would get carried in, so `TASK 23` says it out loud: do not carry it across.

Aspiration is not enforcement, so the check is named and owned: **a build-time assertion that no color literal, breakpoint literal or route string appears outside its declaration site** — `TASK 23` for tokens, `TASK 22` for routes, as a property and never a roster.

### On not renumbering

Two items were added and three rewritten, and nothing was renumbered. `G-10`: **ids are stable once published and a retired id is never reused.** The sequence lives in a table at the head of the backlog instead, which is also more honest — `TASK 30` runs first and `TASK 27` runs sixth, and no numbering scheme was ever going to survive the next insertion anyway.

## Verification

```yaml
done:
  docs:       { status: passed, evidence: ["TASKS.md — TASK 21-31 inserted, with a sequence table since ids are stable and order is not the id (G-10); TASK 8 closed with its four constraints discharged; TASK 6 unblocked and its trigger restated"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS", "no numbers invented: every figure in the backlog is a route count, a breakpoint or an ADR reference"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the pre-existing TASK 12 correlation gap"], reason: "H-03 forbids editing evidence/; TASK 12 owns the fix" }
  tests:      { status: not_applicable, reason: "a planning item produces work items, not code" }
  scope:      { status: passed, evidence: ["eleven items, each with one deliverable and a done someone else could check (P-01); no entry reads 'investigate X'", "the author's three corrections landed as structural changes, not wording: CI became the only deploy path from the first deploy, the fidelity harness moved ahead of the pages it checks, and one-datum-one-declaration became criterion 4 with a mapping table and a named build-time check"] }
  loose_ends: { status: passed, evidence: ["ADR-003's two open items assigned to TASK 22; the deferred /case-studies index and the deferred contact Worker both carry stated triggers rather than being dropped", "ADR-005's unexecuted push — accepted 2026-08-19, never performed, owned by nobody — became TASK 30"] }
  mutation:   { status: not_applicable, reason: "no code touched" }
  security:   { status: not_applicable, reason: "no boundary changed; two items explicitly keep credentials out of the session (G-08)" }
  iterations: { status: passed, evidence: ["2"] }
```

## Next

`TASK 30` — the GitHub remote. Then `TASK 21`, the skeleton and its workflow. Both are small, and the author's part of them — creating the remote, reviewing the first diff, pushing, and adding two repository secrets — is the only work an agent cannot do (`H-01`, `G-08`).
