---
slug: multi-tenant-biometric-attendance
lang: en
type: case-study
title: "A multi-tenant attendance platform across industrial plants"
subtitle: "Bridging biometric hardware, a third-party HR system and a mobile app — as a modular monolith, on purpose"
role: "Systems Analyst & Lead Developer"
context: "Agro-industrial holding · multiple plants nationwide"
period: "2022–2023"
outcome: "Production across multiple companies, thousands of employees"
stack: [".NET", "Entity Framework", "Angular", "biometric terminals", "C4 model"]
skills: [multi-tenancy, systems-integration, architecture-documentation, modular-monolith]
featured: false
confidentiality: sanitized
---

## Context

An agro-industrial holding operating several companies and industrial plants across
the country needed employees to mark attendance and access HR information from their
phones. Until then, attendance meant a biometric terminal at the plant gate, and any
HR query meant a trip to an office.

I designed and led the implementation of the platform that connects those three
worlds: biometric hardware on the plant floor, a third-party HR system, and a mobile
app in the employee's hand.

## Problem

Build an attendance and HR self-service platform that:

- serves multiple client companies within the holding, with strict data isolation
  between them;
- integrates with biometric terminals already installed across plants;
- integrates with the third-party HR system that is the system of record for
  employee data;
- synchronises between mobile clients and backend in near real time;
- is architected so it can eventually be sold as SaaS to companies outside the
  holding.

## Constraints

- The biometric terminals were already deployed and could not be replaced.
- The HR system was third-party and could not be modified — only integrated with.
- Tenant isolation was a contractual requirement from the client, not a technical
  preference.
- Small team, single operations capability. Whatever we built, we had to run.

:::diagram{id="attendance-c4-context" type="c4-context"}
System context: employees and HR administrators, the mobile app, the platform, the
biometric terminals and the third-party HR system.
Spec: existing C4 context diagram — sanitise vendor and company names before publishing.
:::

## Approach

### Modular monolith, with microservice-shaped boundaries

The obvious 2022 answer was microservices. I chose a modular monolith instead, and
documented the module boundaries with C4 diagrams as though they were services —
so that extraction later would be a deployment change rather than a redesign.

Reasoning: a small team, a single deployment target, and a tenant count in the tens
rather than the thousands. Microservices would have bought independent scaling we did
not need, at the cost of operational complexity we could not staff. The boundaries
were the valuable part; distributing them was not.

The modules: organisational data, identity and access, attendance, and internal
communications — each with its own domain, its own persistence access, and an
explicit contract to the others.

:::diagram{id="attendance-c4-container" type="c4-container"}
Container view of the platform: mobile app, admin panel, API modules and per-tenant
databases.
Spec: existing C4 container diagram. Emphasise the module boundaries as the future
service seams.
:::

:::diagram{id="attendance-c4-component" type="c4-component"}
Component view of the attendance module, including the terminal integration path.
Spec: existing C4 component diagram.
:::

### Database per tenant

Tenant isolation is implemented as a separate database per client company. The
tenant is resolved at request time and the connection routed accordingly.

**The trade-off:** database-per-tenant gives the strongest isolation guarantee
available short of separate infrastructure — which is exactly what the client's
contract required, and what makes an eventual SaaS story credible. It costs
migration fan-out. Every schema change is executed N times, and N grows with every
customer. That is a real operational tax, and it is the reason I would revisit this
decision at a different scale rather than pretend it was free.

### Integration in two directions

The biometric terminals were first integrated with the HR system directly, and then
brought into the platform's own APIs — a staged approach that let attendance keep
working through the transition rather than requiring a cutover at every plant
simultaneously.

On the other side, an integration layer sits between the proprietary mobile backend
and the third-party HR system, so that the HR vendor remains the system of record
while the platform owns the employee-facing experience.

## Result

- In production across multiple companies within the holding.
- Remote attendance marking and HR self-service for thousands of employees.
- Reduced administrative load on HR departments — queries that previously required
  an office visit became self-service.
- Architecture and isolation model positioned for a future SaaS offering.

[NEEDS INPUT] Number of tenants at handover, and any measure of the reduction in HR
administrative workload. Even a rough figure would make the impact section concrete.

## What I would do differently

**Automate the tenant migration pipeline on day one.** I chose database-per-tenant
knowing it multiplied migration effort, and then handled migrations manually for
longer than I should have. If the isolation model creates N of something, the
tooling for running things N times is part of the isolation model, not a follow-up
task.

**Consider schema-per-tenant as the middle ground.** It gives most of the isolation
with a single migration target. In this specific case the client's contractual
language pointed at separate databases, but I did not seriously evaluate the
alternative — I went straight to the strongest option because it was the safest to
defend, which is not the same as being the best.

**Document for the operators, not just the architects.** The C4 diagrams were good
for explaining the design and useless for running the system at 3am. A platform
across multiple physical plants needs runbooks as much as it needs architecture
diagrams.
