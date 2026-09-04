---
slug: experience
lang: en
type: page
title: "Luis Octavio Antelo · Experience"
confidentiality: sanitized
h1: "I had to solve the same problem in every place I worked"
intro: "A system built for a reality that had stopped existing, and a business that moved on faster than it did. Another industry, the same shape. Again."
roles:
  - company: "NICE"
    logo: nice.svg
    period: "2025–2026"
    title: "Senior Software Engineer"
    body:
      - "I joined a platform serving millions of users and spent six months on two different kinds of ownership: the technical kind (multitenant features and a performance fix I pushed through as a proper ADR instead of shipping it quietly) and the people kind, mentoring the junior half of the backend team and building the agentic AI tooling that's now part of how we review code."
      - "The platform is a globally distributed enterprise CX product: legacy PHP and vanilla JavaScript running next to a modern .NET stack, the same \"make the old and the new talk to each other\" problem at a different scale. Working for customers across US and EU jurisdictions meant designing around how their data-protection regimes actually differ, not just checking a compliance box."
    stack: [".NET", "legacy PHP", "vanilla JavaScript", "elasticSearch", "AWS", "Jenkins", "RAG", "LLMs", "Snowflake", "Grafana"]

  - company: "Banco Solidario S.A."
    logo: banco-solidario.svg
    period: "2023–2025"
    title: "Backend Developer → Solution Architect in practice"
    body:
      - "As a developer at Banco Solidario S.A. I worked on the bank's mobile banking transformation, taking it from a third-party vendor product to an in-house platform used by millions of people. My title stayed developer, but my scope kept growing until I was making architecture calls of my own: I designed the identity and payments architecture, we decoupled the OTP service that had become a critical dependency, and I migrated the payment history off the legacy platform without losing a record. I also owned the design and development of the QR Business module, an extension of the app that lets someone else collect payments on your behalf without holding an account at the bank. From nothing to production, and to more than a hundred thousand users in three months. I implemented TOTP-signed transfers and built APIs and distributed services on .NET, the whole AWS ecosystem, RabbitMQ and asynchronous messaging architectures."
    case_studies:
      - otp-provider-decoupling
      - qr-collections-for-merchants
      - legacy-payment-data-migration
    stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "SQL Server", "BIAN", "Flutter"]

  - company: "Mamaya Tech"
    logo: mamaya-tech.svg
    period: "2022–2023"
    title: "Systems Analyst"
    body:
      - "The systems team from my previous role spun out into this company, and I went with it. Same problem, different company: integrating satellite systems into an ERP core, and evaluating the vendors on the other side of those integrations. I also got my first look at low-code platforms."
      - "The work had the same shape it had before the spin-out and the core was literally the same one, except that now I was integrating satellite systems into it from the other side of a corporate boundary instead of from the inside."
    stack: ["Oracle EBS", "PL/SQL", "ERP integration", "Android", "Angular", ".NET", "low-code", "javascript"]

  - company: "Avícola Sofía"
    logo: avicola-sofia.svg
    period: "2021–2022"
    title: "Trainee → Systems Analyst"
    body:
      - "My first real system, end to end: a multitenant attendance platform tying biometric terminals across several industrial plants back into the company's HR system. It started as an improvement to the HRMS integration modules already in use, replacing narrower processes with something we owned, that scaled, and that fit an operation spread across the country. Shipped to production while I was still learning what \"production\" actually meant."
      - "I also built integrations between the production systems and Oracle EBS, working on the systems that carried the business's critical processes. That gap between what the system knew how to do and what the business needed is the one I have been working in ever since."
    case_studies:
      - multi-tenant-biometric-attendance
    stack: ["Oracle EBS", "biometric hardware", "modular monolith", "Angular", ".NET", "SQL Server", "PL/SQL", "PLCs"]
---

**Nothing renders this body.** Every element of this page is drawn from the frontmatter above, and this note is the traceability record, the same shape `home.{en,es}.md` took when its prose stopped being rendered.

| Page element | Where it comes from |
|---|---|
| the headline and intro | `h1` and `intro` above |
| each entry's company, years and role | `roles[].company`, `.period`, `.title` |
| each entry's prose | `roles[].body` |
| the case-study rows | `roles[].case_studies`: **slugs**, joined against the route set, so each row's title and href come from that case study's own file in this page's locale |
| the technology line | `roles[].stack` |
| the "most recent" badge | derived from the record's own order, not written anywhere |
| the logo squares | a logo file where one exists; absent is a supported value |
| the availability note and the LinkedIn link | `ui.experience.cv_note` and `.full_history` |