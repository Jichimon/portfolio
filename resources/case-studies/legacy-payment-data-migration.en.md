---
slug: legacy-payment-data-migration
lang: en
type: case-study
title: "Migrating payment data out of a system nobody understood"
subtitle: "Reverse-engineering an undocumented legacy feature, then writing a migration someone else had to execute"
role: "Backend Engineer"
context: "Regulated bank · Latin America"
period: "2024"
outcome: "Millions of records migrated, zero production incidents"
stack: ["SQL Server 2012 → 2022", "T-SQL", "batched stored procedures"]
skills: [reverse-engineering, data-migration, technical-writing, governance, risk-management]
featured: true
order: 4
confidentiality: sanitized
---

## Context

The bank was retiring its old third-party vendor mobile app and we had to get an in-house one out in record time. Along the way my team and I found a feature that could not simply be rebuilt: saved service payments. Users had configured their electricity bills, their water bills, their taxes, their recurring payees in the old app, over years. Some of them had a dozen. Millions of records in total.

The new platform used a different data model on a different database server, and the payment flow itself now belonged to a different team behind a payment gateway. That gateway did not yet support saved multi-channel payments, and we still had to ship the feature to users.

## Problem

The problem was not the migration. It was that **nobody in the organisation knew how
the legacy feature worked.**

No technical documentation. No original authors still available. A schema on SQL
Server 2012 whose column semantics had to be inferred from behaviour. Fields that
meant different things depending on the value of other fields. States that were only
reachable through specific sequences in the old UI.

And the data is financial and personal. A wrong mapping does not produce a broken
page. It produces a customer paying someone else's electricity bill.

## Constraints

**I did not own the database and could not execute in production.** Under the bank's
data governance model, production database changes are executed by the database
team, after security and management approval. My deliverable could not be "a
migration I ran". It had to be a specification precise enough for another team to
execute without me in the room.

**Production could not be locked.** The legacy database was still serving traffic during the transition.

**One single opportunity.** A migration of financial records is not something you iterate on in production.

**Sensitive data.** Every step subject to security review.

## Approach

### Phase zero: reverse-engineering

Before writing any migration code, I started using the legacy application as a user and documenting everything it did. I checked the database after every action. Every scenario, every combination, every column, every state transition. What each field meant. What made it null. What made it change.

This is the part of the project that took me by far the longest and looked, from the outside, like nothing was happening. It is also the part that gave me the confidence that the migration was going to be correct.

Out of it came two documents: a specification of the legacy model as it actually
behaved, and a column-by-column mapping to the target model with the exact
configuration each destination field required.

### Three phases, because the model changed shape

The new model was not a renamed version of the old one, it was a different thing altogether. Several legacy columns became tables in the new schema, which meant they had parents that had to exist first. So I decided the migration had to run in three ordered phases:

1. Extract into staging tables on the source server, then export to flat files.
2. Load into the new server during an off-hours window.
3. Reshape into the target model: the phase where columns became rows in new
   tables.

:::diagram{id="migration-phases" type="flow"}
Three-phase migration pipeline from the legacy server to the new one.
Spec: show, for each phase, the paired migrate/verify procedures and the batch loop.
Emphasise that verification is a gate, not a report.
:::

### Every phase has a verifier

Each phase was implemented as two stored procedures: one that performed the
migration, and one that verified the result against that phase's acceptance
criteria. The second is the one that mattered. A migration procedure tells you it
finished. A verification procedure tells you whether it was right.

Helper routines logged every record touched: the source id, the outcome, and for
rejections, the specific reason. When the phase ended, you could answer "what
happened to this specific customer's saved payment?" for any record in the set.

### Batched, always

Every procedure advanced in batches. Millions of records against a production
database that was still serving users means the only acceptable lock profile is
short and repeated. No single long transaction anywhere in the pipeline.

### The decision not to build a service

The instinct on a backend team is to build a migration service or endpoint. I chose
stored procedures and SQL instead, for three reasons:

1. **It is a one-time execution.** A service would have been a codebase, a
   deployment, a pipeline, and a set of tests, all built to run once and then be
   deleted. Boilerplate with a shelf life of a single evening.
2. **Governance.** The database team owned the production database, and their
   approval path, their tooling and their review process are built around SQL. A
   .NET service would have put the work *outside* the bank's data governance path
   and made approvals slower, not faster.
3. **The deliverable was never code, it was a runbook.** Since I could not execute
   in production, the artifact that mattered was a document another team could
   follow step by step. SQL procedures with logging and verification built in are a
   far better fit for that than an application someone else has to operate.

## Result

- Millions of saved payment records migrated across two major database versions and
  two different data models.
- **Zero production incidents related to the migration.**
- No lock contention on the production database.
- Per-record traceability for the full set.
- A legacy feature that had been undocumented for years is now fully specified.

The honest cost: it took considerably longer than estimated. The early stages failed
repeatedly, because probing the legacy system was the only way to learn how it
behaved, and each wrong assumption surfaced as a failed test run.

## What I would do differently

**Budget discovery as its own phase, with its own estimate.** I estimated this as a
migration and treated reverse-engineering as part of implementation. They are
different activities with different risk profiles, and folding one into the other is
why the schedule was wrong from the first day. Discovery on an undocumented system
is unbounded until it isn't, and the estimate has to say so.

**Write the verification procedure before the migration procedure.** In the first phase I wrote the migration procedure first, and the verifier ended up shaped by what the migration assumed. For the other two I swapped the order and it worked far better: defining what "correct" means before writing the thing being checked is test-first, applied to data.

**Ask earlier who else needs the specification.** The legacy documentation I produced
turned out to be useful to two other teams that were also migrating away from the
same system. I found that out by accident, months later.
