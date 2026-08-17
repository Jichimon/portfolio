# 2026-08-16 · Session 01 — about.md case-study link consistency, TASK 3 closed out

**Task:** TASK 3 — Resolve `[NEEDS INPUT]`
**Status after this session:** DONE

## What was done
Follow-up to session 07: the author flagged that adding a link on the OTP mention
in `about.es.md` (to match `about.en.md`) exposed an inconsistency that predated
this task — only one of four case-study/platform mentions in `about.md`'s
narrative paragraphs was ever linked. Added the other three, both locales, rather
than removing the one that existed.

## Decisions
- **Linked all four case-study mentions in `about.md`'s narrative, not just
  OTP.** The multitenant-attendance sentence, the identity-and-payments clause
  (→ `mobile-banking-platform`, the umbrella platform entry), and the
  legacy-payment-migration clause were all unlinked prose describing work that
  has its own page. Rejected the alternative (strip the one existing link for
  consistency) — TASK 2's "every claim traceable to a case study" rule points at
  adding links, not removing the one that worked.
- **Left `experience.md` as-is.** It links `otp-provider-decoupling`,
  `qr-collections-for-merchants` and `legacy-payment-data-migration` under the
  Banco Solidario paragraph but never links `mobile-banking-platform` itself.
  Flagged it to the author as the same category of gap; they did not ask for a
  change, so it stays untouched. Worth revisiting if it comes up again.

## Open questions
None. TASK 3 is closed — all four `[NEEDS INPUT]` markers resolved (session 07)
and the link-consistency follow-up is done.

## Next
TASK 4 — GitHub profile README.

## Files changed
`resources/site/about.en.md` / `.es.md` — added links to `multi-tenant-biometric-attendance`, `mobile-banking-platform` and `legacy-payment-data-migration` alongside the existing OTP link.
`progress/2026-08-16-01-task3-about-link-consistency.md` — this log.
