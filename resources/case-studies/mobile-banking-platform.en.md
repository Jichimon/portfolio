---
slug: mobile-banking-platform
lang: en
type: platform
title: "Rebuilding a bank's mobile platform in-house"
subtitle: "Replacing a vendor banking app with a cloud-native platform bridging a legacy on-premise core"
role: "Backend Engineer → Solution Architect"
context: "Regulated bank · Latin America"
period: "2023–2025"
scale: "+1M"
scale_caption: "active users"
stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]
skills: [distributed-systems, legacy-integration, api-design, async-messaging, regulated-environments]
featured: true
order: 1
confidentiality: sanitized
---

## Context

A regulated bank in Latin America ran its mobile banking on a third-party vendor
product. The bank decided to bring the channel in-house: full control over the
roadmap, no vendor lock-in, and the ability to ship features at its own pace.

I joined the platform team as a backend engineer and ended up owning the design of
several of its core services. The platform now serves more than a million of
active users.

This page is the umbrella. Three specific problems within it are documented in
depth as separate case studies.

## The central constraint

Everything on this platform is shaped by one fact: **the source of truth is a
legacy core banking system that runs on-premise and cannot move.** Regulatory data
residency rules, decades of accumulated business logic, and a transaction model
that predates the concept of a mobile channel.

So the platform is not "a cloud application". It is a translation layer between a
cloud-native service mesh and an on-premise core, where every hop crosses a trust
boundary, a latency boundary, and a compliance boundary.

:::diagram{id="platform-c4-context" type="c4-context"}
System context: mobile clients → BFF → domain microservices → on-premise core.
Spec: show the cloud/on-premise boundary explicitly as the dominant visual element.
Include external actors: identity provider, messaging provider, payment gateway.
No internal service names.
:::

## Architecture

**Backend for Frontend.** All mobile operations enter through a single BFF channel.
It owns orchestration, response shaping, and the fan-out to domain services — so the
mobile client never talks to a domain service directly, and domain services never
carry channel-specific concerns.

**BIAN-aligned service boundaries.** The bank's architecture standard maps services
to business capabilities rather than to technical layers. This is a real constraint,
not a formality: it is why credential *management* and credential *verification* live
in different services (see below), and it made cross-team integration contracts far
cheaper to negotiate than they would have been with ad-hoc boundaries.

**Asynchronous confirmation.** Transaction flows publish to a topic and consume from
queues rather than blocking on the core. The mobile client gets an immediate
acknowledgement; settlement confirmation arrives asynchronously. This is what
brought end-to-end transaction time down from 5–7 seconds to 1–3 seconds.

**On-premise service for restricted data.** A dedicated service holds user data that
regulation does not allow in the cloud. The cloud services hold references, not the
data itself.

## Services I designed and owned

- **BFF for the mobile channel** — orchestration, event publishing and queue
  consumption via a message bus abstraction.
- **Identity gateway** — abstracts a commercial identity provider from the bank's
  own user contracts; hashes and encrypts credentials before they leave the
  perimeter; serves every digital channel.
- **Credentials service** — creation, reset and lifecycle of user credentials,
  callable from branch, web and mobile.
- **Payment instruction service** — orchestrates calls to the payment gateway, with
  retry policies and explicit transaction state management.
- **Correspondence service** — unified outbound communication: push, email, and
  messaging, plus one-time password delivery.
- **On-premise data service** — regulated-residency storage.

## One decision worth explaining: two services, not one

Credential *management* and identity *verification* were split into two services.
The obvious objection is that this is one bounded context and one deployable would
be simpler.

The load profiles are completely different. Verification runs on every login and
every session refresh — it is high-volume and latency-critical. Credential
management runs on enrolment, reset and recovery — it is low-volume and
tolerates latency. Coupling them means a credential-management incident can take
down login for every channel at once.

Splitting them let each scale on its own curve and kept the critical path thin.
The cost is an extra network hop and two deployables to operate. At this volume,
that was the right side of the trade.

:::diagram{id="platform-auth-boundary" type="c4-container"}
Container view of the split between the credentials service and the identity gateway.
Spec: highlight the difference in call volume between the two paths with edge weights
or annotations. Show the three consuming channels.
:::

## Results

- End-to-end transaction time reduced from 5–7s to 1–3s.
- Vendor dependency for the mobile channel eliminated.
- Measurable improvement in customer satisfaction scores after migration.
- Architecture able to scale horizontally per capability rather than as a monolith.

## What I would do differently

**The channel abstraction.** I modelled per-channel behaviour by extending a base
class once per channel. The channels turned out to differ far more than I assumed,
and the inheritance tree became the wrong shape — a configuration map inside a
single base implementation would have absorbed the variation without a new type per
channel. I now treat "one subclass per external integration" as a smell until the
variation is proven to be behavioural rather than structural.

**Documentation for non-technical stakeholders.** My design documents were written
for engineers. When I had to defend decisions to management, I spent the meeting
translating instead of arguing. Architecture work in a regulated environment is
partly a communication problem, and I under-invested in that half.

## Deep dives

- [Letting merchants delegate payment collection to people without bank accounts](/case-studies/qr-collections-for-merchants)
- [Taking second-factor authentication back from a vendor](/case-studies/otp-provider-decoupling)
- [Migrating payment data out of a system nobody understood](/case-studies/legacy-payment-data-migration)
