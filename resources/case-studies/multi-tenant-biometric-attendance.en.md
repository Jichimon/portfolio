---
slug: multi-tenant-biometric-attendance
lang: en
type: case-study
title: "A multi-tenant attendance platform across industrial plants"
subtitle: "Bridging biometric hardware, a third-party HR system and a mobile app as a modular monolith, on purpose"
role: "Systems Analyst & Lead Developer"
context: "Agro-industrial holding · multiple plants nationwide"
period: "2022–2023"
outcome: "Production across multiple companies, thousands of employees"
stack: [".NET", "Entity Framework", "Angular", "biometric terminals", "C4 model"]
skills: [multi-tenancy, systems-integration, architecture-documentation, modular-monolith]
featured: false
order: 5
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
Container view of the platform: mobile app, admin panel, API modules and the shared
tenant database.
Spec: existing C4 container diagram. Emphasise the module boundaries as the future
service seams, and label the tenant database as shared, not per-tenant.
:::

:::diagram{id="attendance-c4-component" type="c4-component"}
Component view of the attendance module, including the terminal integration path.
Spec: existing C4 component diagram.
:::

### A shared tenant database, with a dedicated option designed but never built

Tenant data isolation was implemented as a single tenant-shared database, separate
from the system database (configuration and cross-tenant data), with every row
scoped by tenant id and the connection resolved at request time. The design also
included a path for a tenant to opt into its own dedicated database instead of the
shared one, for a client whose contract demanded stronger isolation. That path was
never built — all 14 tenants at handover ran on the shared database.

**The trade-off:** a shared database is far cheaper to operate — one migration
target, one thing to patch, one thing to monitor — at the cost of a weaker isolation
guarantee than physical separation gives. It was a reasonable bet given that every
tenant's actual contract was satisfied by it. What was not free was designing and
carrying the dedicated-database escape hatch in the data-access layer for a
requirement no client ever exercised — that is a cost I paid for optionality I never
used.

### Integration in two directions

The biometric terminals were first integrated with the HR system directly, and then
brought into the platform's own APIs — a staged approach that let attendance keep
working through the transition rather than requiring a cutover at every plant
simultaneously.

On the other side, an integration layer sits between the proprietary mobile backend
and the third-party HR system, so that the HR vendor remains the system of record
while the platform owns the employee-facing experience.

## Result

- **14 tenants in production** across the holding at handover.
- Remote attendance marking and HR self-service for thousands of employees.
- **~30% reduction in HR administrative workload** — queries that previously
  required an office visit became self-service.
- Architecture positioned for a future SaaS offering — though the shared-database
  model would need the dedicated-per-tenant path actually built before that story
  holds up outside the holding.

## What I would do differently

**Don't design an escape hatch you don't validate.** The plan included a path for a
tenant to opt into a dedicated database instead of the shared one, in case a
client's contract demanded stronger isolation. No client ever exercised it, so it sat
in the data-access layer as complexity nobody used. I would ship the shared model
alone and add the dedicated path the day a real contract required it, not before.

**Check the isolation requirement per client, not once for all of them.** I read
"tenant isolation is contractual" as a blanket constraint and designed for the
strictest case across the board. In practice the shared database satisfied every one
of the 14 tenants at handover. The requirement was real, but I should have verified
it against each client's actual contract language instead of assuming the strongest
interpretation applied everywhere.

**Document for the operators, not just the architects.** The C4 diagrams were good
for explaining the design and useless for running the system at 3am. A platform
across multiple physical plants needs runbooks as much as it needs architecture
diagrams.
