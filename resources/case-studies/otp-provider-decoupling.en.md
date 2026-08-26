---
slug: otp-provider-decoupling
lang: en
type: case-study
title: "Taking second-factor authentication back from a vendor"
subtitle: "Decomposing an overloaded notification service and choosing the more expensive compute option on purpose"
role: "Solution Architect"
context: "Regulated bank · Latin America"
period: "2025"
outcome: "Approved decomposition plan, execution begun; OTP cutover not completed before handover — ~70% reduction in monthly run cost was the target"
stack: [".NET", "AWS Fargate", "AWS Lambda", "DynamoDB", "Aurora", "SNS/SQS"]
skills: [architecture-decision-records, cost-engineering, service-decomposition, latency-analysis]
featured: true
order: 3
confidentiality: sanitized
---

## Context

One service in the bank's mobile platform had grown into a catch-all for everything
outbound: push notifications, email, messaging, device token registration, and the
generation and validation of one-time passwords used as a second authentication
factor.

Five unrelated flows, one deployable, one relational database, one scaling curve.
The volume spread across them covered three orders of magnitude — push notifications
ran into the double-digit millions per month, while OTP operations ran in the
hundreds of thousands. Everything scaled together, on the shape of the largest flow.

The OTP flow itself was not ours at all. Generation, validation and delivery were
delegated to a third-party OTP-as-a-service product, billed at a premium per
verification.

## Problem

Three problems, in the order they mattered to the business and the reverse order of
how interesting they are technically.

**Cost.** The vendor's verification product was the single largest line item in the
entire notification stack — larger than every piece of compute and database combined,
by more than an order of magnitude. At our volume the premium had stopped being
worth what it bought.

**Control.** Second-factor authentication is a critical path, and we did not own it.
The audit trail lived in the vendor's console, not in our systems — which is an
uncomfortable position for a regulated institution. And a roadmap item we knew was
coming, TOTP for transaction signing, had no path forward inside a vendor product.

**Coupling.** Unrelated flows sharing a deployable, a database and a scaling policy.
Business logic had leaked into the database schema. An incident in one flow was an
incident in all five.

## Constraints

- Every generation and every validation attempt must be auditable, retained for
  roughly a year, in a regulated environment.
- Authentication flows cannot take downtime during the transition.
- Service boundaries must map to business capabilities under the bank's BIAN
  standard.
- Small team. The number of things we could afford to *operate* was a real limit on
  the design.

:::diagram{id="otp-c4-before" type="c4-container"}
Before: one service handling five unrelated outbound flows against a shared database.
Spec: annotate each flow with its relative volume so the three-orders-of-magnitude
spread is visible at a glance. This is the diagram that makes the argument.
:::

## Approach

### Decomposition

The single service became a thin orchestrator plus three focused services:

- **Verification** — the full OTP lifecycle: generation, validation, attempt
  tracking, and the audit record.
- **Contact handler** — the device token registry. Read-heavy, structurally
  different from everything else.
- **Push listener** — a queue consumer for the highest-volume flow.

The orchestrator retains channel routing and delivery records. Each service now
scales on its own curve, and the OTP path no longer inherits the push notification
deployment.

For challenge storage I chose a key-value store with native time-based expiry, so
records self-delete at the end of the retention window instead of requiring a
scheduled cleanup job. Delivery records stayed relational, where they are queried.

:::diagram{id="otp-c4-after" type="c4-container"}
After: orchestrator plus three focused services, with the vendor reduced to message
delivery only.
Spec: same layout as the "before" diagram so the two can be compared side by side.
:::

### The compute decision

For the verification service, two viable options.

**Serverless functions.** Roughly half the monthly cost at our volume, and faster to
build and ship.

**Always-on containers.** Roughly double the cost. Predictable P95, no cold starts,
consistent with how everything else on the platform is operated.

I chose containers — the more expensive option — for reasons that had nothing to do
with the monthly bill:

1. **Cold starts on a second factor.** A user who has already entered their password
   and is waiting for a code is at the least forgiving point in the entire session.
   Variable tail latency there is a product problem, not just a metric.
2. **Two functions or one service.** The serverless design meant separate functions
   for generation and validation — two things to observe, two log streams to
   correlate during an incident, two places to change when TOTP arrives.
3. **The absolute difference was small.** At this volume the gap between the two
   options was a rounding error next to the vendor cost we were removing. Optimising
   it would have been optimising the wrong number.

### The number that actually mattered

The same serverless-versus-containers analysis, applied to the push notification
listener at double-digit millions of operations per month, came out the opposite
way — and not marginally. Serverless would have cost roughly fifty times more.

So the useful output of the analysis was never "use containers". It was the
**break-even point: around 430,000 operations per month**, below which serverless
wins and above which it does not. That threshold is reusable. A recommendation is
not.

:::diagram{id="otp-breakeven" type="table"}
Cost curves for serverless vs containers across the operation-volume range, with the
break-even marked and each of the platform's flows plotted on the axis.
Spec: log scale on volume. Mark where OTP, contact handler and push listener each sit.
:::

## Result

The compute decision and the service decomposition were approved, and execution
began. I left the bank shortly after, before the OTP flow was actually cut over to
the new in-house verification service — so what follows is the plan's targets, not
measured outcomes.

- **Projected ~70% reduction** in the monthly run cost of the notification stack,
  once OTP validation moves fully off the vendor.
- Complete audit trail of generations and validation attempts inside the bank's own
  systems — the design target; the vendor was still in the critical path when I left.
- Latency targets: validation P95 from 83 ms to ≤70 ms; generation P95 from 210 ms to
  ≤200 ms.

An honest note on that last figure, still true as a target. Generation would improve
only marginally, because it is dominated by the outbound message hop to the delivery
provider — a hop the design kept. The new in-house network call and the removed,
slower vendor call roughly cancel. The intended win here was cost and control, not
latency — claiming a latency win would have been dishonest, and the review would have
caught it.

I don't have post-cutover numbers, and I won't: I left the bank before the OTP flow
was actually moved off the vendor, so there is no measured P95 or real monthly cost
to report — only the targets above, from the plan that was approved.

## What I would do differently

**Choose the persistence engine against the reporting requirements, not just the
access pattern.** I selected the key-value store for the write path — high write
volume, simple key lookups, native expiry — and flagged the analytics question as
open. That is backwards. Audit data in a regulated environment exists to be queried
by people who are not engineers, and I should have gathered those query patterns
before choosing the engine rather than after.

**Lead with the financial case.** The engineering case for decomposition had been
obvious for a while and had gone nowhere. The proposal moved the week it opened with
the cost table. In a bank, the architecture argument is the second argument.

**Plan a shadow period.** I would run in-house validation alongside the vendor,
comparing results without acting on ours, before cutting over. On an authentication
path the cost of that caution is very low and the cost of being wrong is very high.
