# 2026-08-15 · Session 07 — TASK 3: resolve `[NEEDS INPUT]`

**Task:** TASK 3 — Resolve `[NEEDS INPUT]`
**Status after this session:** DONE

## What was done
Asked the author for the four blocking facts directly, got answers for all three
case studies, and discovered mid-session that one answer contradicted the case
study's existing text — not just a missing number. Rewrote content in both locales
across three case studies plus the two site pages that had inherited the same
overstatement, updated two already-generated `.mmd` diagrams to match, and ran
`check-terms.sh` clean.

## Decisions
- **`otp-provider-decoupling` result is reframed as a plan's targets, not achieved
  outcomes.** The author left the bank after the plan was approved and execution
  began, before the OTP flow was actually cut over — there is no measured P95 or
  real monthly cost, and there will not be one. Rejected leaving the marker in
  "pending" limbo; a case study should not imply a number is still coming when it
  is not. This also required reopening `home.{en,es}.md` and `about.{en,es}.md`
  (TASK 2, already closed) since both cited the OTP outcome as a completed fact —
  correctness took priority over leaving a closed task untouched.
- **`multi-tenant-biometric-attendance` architecture description was factually
  wrong, not just missing a number.** The case study said "database per tenant";
  the real implementation was a single tenant-shared database for all 14 tenants,
  with a dedicated-per-tenant opt-in designed but never built. Rewrote the
  "Database" section, both related "What I would do differently" bullets, the
  `attendance-c4-container` diagram spec, and both affected `.mmd` files
  (`attendance-c4-container.mmd`, `attendance-c4-component.mmd`) rather than
  patch around the error. Rejected treating this as out of scope for TASK 3 — an
  inaccurate architecture claim is a bigger risk to the portfolio than a missing
  metric.
- **The holding's real name stays out of the case study and diagrams.** It was
  confirmed during this session and added to `private/glossary.md` (not
  committed). It already appears by name in `home`/`about`/`experience` under the
  2026-08-15 employer-naming policy recorded in the glossary — that policy
  explicitly does not extend to case studies or diagrams, so no case-study text
  was changed on that front.
- **Kept the QR numbers as given, without normalizing units.** The author gave a
  rate (~8 tx/sec) and a percentage (~15% non-customers); wrote them as-is rather
  than converting to a monthly total, since the source figures were approximate
  and conversion would imply false precision.

## Open questions
None outstanding for TASK 3 — all four markers are resolved. One thing worth a
future look, not blocking: the reworded OTP `Result` section is longer and more
qualified than the rest of the portfolio's results sections; worth a read-through
next session to check it still reads as strong evidence and not as a hedge.

## Next
TASK 4 — GitHub profile README. It's the next `TODO` item and unblocked; TASK 3
being closed removes the last blocker ahead of TASK 5 (website), which stays
blocked until TASK 4 closes too.

## Files changed
`resources/case-studies/otp-provider-decoupling.en.md` / `.es.md` — reframed
`Result` and frontmatter `outcome` as plan targets, not achieved outcomes; removed
the marker.
`resources/case-studies/qr-collections-for-merchants.en.md` / `.es.md` — added
transaction volume and non-customer share to `Result`; removed the marker.
`resources/case-studies/multi-tenant-biometric-attendance.en.md` / `.es.md` —
added tenant count and HR workload reduction to `Result`; rewrote the "Database"
section and two "What I would do differently" bullets to match the actual
shared-database implementation; updated the `attendance-c4-container` diagram
spec; removed the marker.
`resources/site/home.en.md` / `.es.md` — reworded the OTP evidence bullet to not
overstate completion.
`resources/site/about.en.md` / `.es.md` — reworded the OTP mention in the career
narrative to not overstate completion.
`resources/diagrams/attendance-c4-container.mmd` — tenant DB node relabeled from
per-tenant to shared.
`resources/diagrams/attendance-c4-component.mmd` — same relabel.
`private/glossary.md` — added the holding's real name (not committed).
`TASKS.md` — TASK 3 status `BLOCKED` → `DONE`, with resolution notes.
