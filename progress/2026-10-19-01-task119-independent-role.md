# 2026-10-19 · Session 01 — TASK 119 opened: the independent role, the thesis candidates, and the branch model

**Task:** TASK 119 — Independent role and hero thesis
**Status after this session:** IN PROGRESS — the packet is drafted and waiting on the author's paste; every other half of the item is written or follows from the paste.

## What was done

- Analyzed the three requested features (site metrics, hero CTA, freelance experience) against the whole harness and register. The author chose: a public footer visit counter (a later `feature` item), a hero CTA (a later `feature` item), and this item first — the independent role, content-only, because the four-month silence in the published chronology is the most expensive signal the site currently sends.
- The branch model was decided with the author and is now recorded in `CLAUDE.md`'s boundary: `task/NNN-slug` branches, one per work item, landed by pull request into `main`, the only branch CI deploys. The deploy half already lives in `.github/workflows/ci.yml` (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`); nothing in CI changed.
- `TASK 119` opened in the register, and the author packet drafted word for word in both locales, with `<...>` questions where only the author has the facts (`C-01`, `C-04`).
- **Revised later the same session, on the author's request to review the two product repositories.** The `<...>` blanks were replaced with bullets drafted from the projects' own ADRs, product docs and status boards — read from the code, not invented (`C-04`) — plus the author's account of the two client builds. Two corrections came out of reading the repos: money-flow's frontend is **React + Vite, not Next.js** as the author first said (its own ADR-001 D6, accepted 2026-08-29, decides this, and its package file confirms it — a published stack you did not use is a false claim, `C-01`), and the queue product's repository carries its own product name, which the author resolved by publishing no product names on the page at all. Both were flagged to the author in the packet rather than silently decided, along with a third flag: whether the real estate engagement had started in code, since the author said "tengo que hacer" (`C-02`).

## Decisions

- **Branch model: per-item branches, no `develop`.** One author, a serial register, and items that share files (`HomeSections`, the artboards, `ui.*`) — a develop branch adds a merge layer without adding a protection the PR gate does not already give. The author enables branch protection on `main` himself (require PR, require the `gate` check, no admin bypass): it is an administrative action on the remote, so it is the author's, like the remote itself was.
- **The role is `content`-typed, not `feature`-typed.** The site already renders a fifth role from `roles[]` with zero template edits — the strip, the anchors, the badge and the e2e assertions all derive from the entry. The remaining work is words, and words in `resources/**` are the author's (`H-02`).
- **Thesis: three candidates, not one.** The author said "quizás cambiar la frase"; the choice is content ownership, so the packet carries keep / restore-the-artboard's / a new hybrid, EN and ES paired, and his word is final.
- **Client names stay generic in the draft** ("a local real estate company", "a concrete posts company"), matching the author's own framing. Naming them is flagged as his call in the packet.

## Findings from validating against real state (P-04)

- **The machinery was already waiting for this item.** `site/tests/e2e/home.smoke.spec.ts:145` and `:97-99` read the roles straight off `experience.<lang>.md`, with a comment saying a fifth employer "moves this assertion by itself rather than going stale beside it". The deep-link anchors derive from the company name (`deriveAnchor`), a collision fails the build naming both, and the wordmark-alone fallback is the designed state for a logo-less card (`TASK 116`).
- **The fifth role activates the logo-less card path in the e2e suite for the first time.** All four current roles declare a `logo:`, so the suite's `withoutLogo` filters have been iterating zero roles; with "Independent work" carrying none, those assertions stop being vacuous the moment the role lands.
- **`main` had no branch protection at session start** — verified: `gh api repos/Jichimon/portfolio/branches/main/protection` answers 404. The deploy gate lives in CI (`needs: gate`, the `if:` above), but a direct push to `main` would still have deployed. The protection command is handed to the author in the session close, not run by the agent.
- **`harness-bootstrap-v1` carries one unmerged commit** — the TASK 9 export for claude-code and opencode (2026-09-04, ~2,600 lines). Left parked, not deleted; it is pushed to origin. `employer-strip` is fully merged (PR #1) and safe to delete.
- **The em-dash left `resources/` in the bilingual rewrite**, so the hybrid thesis candidate and every drafted bullet use colons — the paste cannot silently reintroduce a banned character.
- **The first gate run of this session found the `design canvas` step red on this machine** — a six-week-old CRLF breakage in the derivation tooling, unrelated to this item's files, opened and closed the same session as TASK 120. Recorded here because the run that found it was this item's verification pass, and because it would otherwise read as unexplained red in this session's evidence.

## Done

```yaml
done:
  content:    { status: blocked, reason: "waiting on the author to paste the packet into experience.{en,es}.md and home.{en,es}.md (H-02)" }
  docs:       { status: passed, evidence: ["TASKS.md carries TASK 119 and the goal-1 content row names it", "CLAUDE.md identity line, publication claim and branch model reconciled in the same change"] }
  scope:      { status: partial, reason: "register entry, session log and author packet written; the resources half is the author's, and the four artboards follow the paste" }
  loose_ends: { status: partial, reason: "the author's application is the next session's input; its own loose ends are tracked there" }
  iterations:      { status: passed, evidence: ["2"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=1"] }
```

## Open questions

- None for this session's half. The author's application of the packet — and the two one-line edits it left behind — is the 2026-10-20 session's input.
- Branch protection: the author runs the command from the session close and verifies with the read-back. If a merge ever reports waiting on a check that never arrives, the required-check name needs adjusting in Settings — the job id in `ci.yml` is `gate`.

## Next

The author applies the packet, runs `node scripts/gate.mjs`, and says so. The 2026-10-20 session verifies the application, updates the four artboards that carry employer entries, runs the gate `--profile full`, and closes TASK 119.

## Files changed

- `TASKS.md` — TASK 119 opened; the goal-1 content row names it.
- `progress/handoff/2026-10-19-task119-content.md` — the author packet, both locales.
- `CLAUDE.md` — identity line gains the independent period; the publication claim stops being stale; the boundary records the branch model.
- `progress/2026-10-19-01-task119-independent-role.md` — this log.