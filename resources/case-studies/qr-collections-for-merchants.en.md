---
slug: qr-collections-for-merchants
lang: en
type: case-study
title: "Letting business owners delegate collection to people without bank accounts"
subtitle: "A delegated-authority model built on top of a core banking system that has no concept of a business"
role: "Solution Architect & Backend Developer"
context: "Regulated bank · Latin America"
period: "2025"
outcome: "100,000 users in the first three months"
stack: ["Flutter", ".NET", "SQL Server", "AWS", "BIAN"]
skills: [domain-modelling, authorization-design, legacy-integration, product-ownership]
featured: true
order: 2
confidentiality: sanitized
---

## Context

In Bolivia, getting a real payment-collection product from a bank means a bureaucratic process of at least 30 days, and often a direct agreement with the bank on top of that.
So what small merchants actually do is collect through QR codes generated in the bank's mobile app. The owner generates a QR and sends it to their employees over WhatsApp. The employee then has no way to confirm a sale other than asking the account holder directly, and the time the customer spends waiting ends up making the business look bad.

The workaround that showed up in the field was worse than the problem: owners were handing their banking credentials to their employees.

What they needed was something accessible, easy to use, and without much paperwork.

I owned this product end to end: discovery, domain model, architecture and the integration design, working with UX on the flows and with the implementation team on delivery. It reached 100,000 users within three months of launch.

## Problem

Let an account holder delegate the ability to collect payments on their behalf,
where the delegate:

- may not be a customer of the bank at all, and may not have any bank account;
- must never see the owner's balances, personal data, or non-business movements;
- must be traceable, with every collection attributable to a specific delegate.

And the business transactions have to be separable from the owner's personal ones,
in a core banking system whose transaction model has no notion of "a business".

## Constraints

**The core transaction model could not be changed.** It is the on-premise system of
record for a regulated bank. Adding a first-class "business" entity to it was not on
the table for a first release, and would not have been for many releases after.

**Delegates live outside the identity system.** Every existing authentication path
assumes a bank customer with an account and credentials. A delegate has neither.

**Regulated environment.** Anything touching money movement carries audit,
traceability and approval requirements.

**Build on the existing platform.** The solution had to sit on the current BFF and
BIAN microservice architecture rather than introduce a parallel stack.

## Approach

### A separate service for the merchant domain

A new domain service owns everything about the product: businesses, delegates and the relationships between them. It never touches balances or account data. It asks the QR services for a collection QR and records the business context around it. Keeping this out of the existing services was deliberate: it is a new business capability with its own lifecycle, and working under BIAN made the split simpler than it sounds.

:::diagram{id="qr-c4-container" type="c4-container"}
Container view: mobile app → BFF → merchant domain service, and the path to the
on-premise core for QR issuance.
Spec: show clearly that the merchant service has no direct path to account or
balance data. That absence is the point of the diagram.
:::

### Delegates authenticate at a lower trust tier, on purpose

Instead of forcing delegates into the customer identity model, they are identified
by a composite key: a unique device identifier plus a phone number, bound at
invitation time. The owner onboards them by sharing a QR invitation.

This is deliberately weaker than customer authentication. It is acceptable because the capability granted is extremely narrow: hold a generic collection QR for one specific business. No balance access. The transaction history of that QR and nothing else. No personal data. No second delegate. The owner can revoke at any time.

The design principle: **when hardening an identity costs you the user experience, cut what that identity can do down to the minimum.** A weak identity with a single revocable capability and a read surface limited to what it produced is a defensible position. The same identity with read access to anything would not be.

:::diagram{id="qr-permission-model" type="flow"}
Permission model: Owner and Delegate roles mapped against the operations each can
perform and the data each can read.
Spec: a two-column capability matrix, with the delegate's read column almost empty.
:::

### Business context as transaction metadata

Rather than modify the core transaction model, each transaction carries a
structured metadata field linking it to a business and to the delegate who
generated the QR. Business ledgers, per-delegate reporting and the separation of
business from personal movements are all *derived* from that metadata.

**The trade-off, without dressing it up:** a business is not a first-class entity in the system of record. It is a projection. That let us ship fast without touching the core. Does it cost consistency? It does: transaction metadata is a gold mine for this kind of product, and it is only ever as good as the write path that produces it. And if the core does have to change later to carry more of this, that is a migration, not a refactor. When the alternative was not doing it at all, because of how long changing the core would take, this turned out to be the right call. In similar circumstances I would make it again.

## Result

- **100,000 users within three months of launch.**
- **~8 transactions per second through delegated collections** at steady state.
- **~15% of delegates were not previous bank customers**, participating in the
  bank's payment ecosystem for the first time. Reached with no formal marketing
  plan behind the rollout.
- Delegated collection available to merchants without additional hardware.
- Business and personal movements separated for the merchant, without a change to
  the core transaction model.

## What I would do differently

**Design revocation and audit before the happy path.** Both exist, but they were
designed after the invitation and collection flows rather than alongside them. In a
delegated-authority model, revocation *is* the security model: it deserves to be
the first flow on the whiteboard, not the third.

**Model the business entity properly from the start, and choose to defer it
explicitly.** I arrived at the metadata approach as a way around a constraint. The
better version of the same decision is to model the first-class entity on paper
first, then consciously ship the projection as a documented interim step with a
known migration path. Same outcome, much clearer intent for whoever inherits it.

**Growth was foreseeable and I planned for it in architecture but not in data.** The
service scales. The reporting model built on derived metadata is the part that will
feel the 100,000 users first.
