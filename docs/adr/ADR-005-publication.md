# ADR-005: Publication — public GitHub remote, now, whole repository

**Status:** Accepted
**Date:** 2026-08-19
**Context:** TASK 7 decision 6 (tackled 5th, per the agreed order). This repository currently has no remote at all — confirmed directly against `.git/config`. `.github/workflows/ci.yml` — then named `harness.yml` — exists and is unfiltered (`INC-08`'s fix) but is inert until a remote exists. ADR-004 already made this decision non-blocking for deploy (`wrangler deploy` works without a GitHub remote), so this is genuinely about the **source repository's** visibility — the harness, `.claude/`, `progress/` session logs, `TASKS.md`, everything — not about whether the deployed site is public (it will be, per ADR-004, regardless of this decision).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| **Public now, whole repo** | GitHub Actions minutes are free/unexempt on public repos (vs. 2,000 min/month on private, GitHub Free); the harness itself — 371+ tests, guards, ADR trail, transcribed incidents including this session's `INC-15` — is real evidence of engineering rigor that reinforces this project's own thesis, not a liability; git history confirmed clean (no `private/`, `evidence/`, or unsanitized-original commits, ever); unblocks Cloudflare Workers Builds' git-integrated CI/CD and `TASK 9`'s export trigger immediately | The repository is visible mid-build — `TASK 8`'s site work hasn't started, so a visitor today finds content and process, not a live site |
| **Private now, public later** | Same CI/deploy unblock today, within the private tier's 2,000 min/month budget (plenty at this project's scale); no exposure of in-progress state; confirmed **clean and reversible** — GitHub's own docs describe private→public as a settings toggle, not a re-creation: no URL change, no history rewrite, only accumulated stars/watchers are lost (moot with zero of either today) | Delays whatever positioning benefit the harness itself provides; one asymmetric fact worth naming: making a repo *private* unpublishes a GitHub Pages site built from it — irrelevant here since GitHub Pages was already rejected in ADR-004, but confirms visibility and hosting aren't fully independent axes on every platform |
| **No remote yet** | Zero commitment; revisit anytime | Blocks Workers Builds' git-integrated path and `TASK 9`'s trigger for no offsetting gain — `wrangler deploy` already makes this non-blocking for shipping, so deferring only delays formalizing CI, not deploy itself |

## Decision

**We choose: public, now, the whole repository.**

The author's call, made with the technical facts on the table: unlimited free CI minutes, a clean-and-already-verified git history, and the view that this harness — the spec-first discipline, the guard suite, the ADR trail this exact document belongs to — is itself part of the evidence a senior engineering hire looks for, not internal process better kept hidden. `resources/` (frozen, sanitized per `C-05`/`C-06`), `progress/` (already `check-terms`-clean, confirmed by the gate on every session), and everything else ships as-is.

## Consequences

- **We gain:** immediate, unlimited-minute CI once the remote and workflow trigger fire for real; Cloudflare Workers Builds becomes available as a git-integrated deploy path alongside the manual `wrangler deploy` ADR-004 already established; the harness stands as public, checkable evidence of the author's engineering practice — case studies plus the process that produced them.
- **We accept losing:** the option to polish before anyone sees it — the repository is visible mid-build, `TASK 8` not yet started. No privacy buffer during the remainder of this project's own construction.
- **This creates a dependency on:** a human action outside any agent's tool access — creating the GitHub repository and pushing (`H-01`: agents never invoke a git write, this decision does not change that). This ADR records the decision; the push itself is the author's, whenever they choose to act on it.

## Review trigger

If `check-terms`/`check-content` are ever found to have passed something that should not have been public (a term added to `private/banned-terms.txt` after the fact, or a factual correction that should have been retroactive), the flip back to private is confirmed clean and fast — a settings toggle, not a migration — should it ever be needed. Not expected, given the gate's own discipline, but the reversal path is real and cheap if it is.

## Sources

One researcher pass, this session, 2026-08-19, deliberately narrow (three specific facts, not a technology comparison). Official/vendor, fetched 2026-08-19: GitHub Docs *About billing for GitHub Actions*, *Setting repository visibility*; Cloudflare Docs *Git integration guide (Pages)*, *Workers CI/CD overview*, *Git integration (Workers)*, *Workers Builds*, Feb 2025 changelog. Repository data (`D1`), read/verified directly this session: `.git/config` (no remote), full git history scan (`git log --all --diff-filter=A` over `private/`, `evidence/`, `*.original.*`, `uploads/` — zero hits), branch/commit count (1 branch, 7 commits, 1.1 MB `.git`).

**Evidence caveat carried forward:** whether Cloudflare Workers Builds specifically (not its sibling, Pages) supports private repositories was not found as an explicit, direct statement — only strong circumstantial evidence (a shared GitHub App, an identical connection flow to Pages, which does state explicit private-repo support). Moot for this decision (chosen: public), but relevant if this is ever revisited toward private.
