---
slug: experience
lang: en
type: page
title: "Luis Antelo — Experience"
confidentiality: sanitized
h1: "Every employer was different. The problem never was."
intro: "A system too important to touch, and a business that needed it to do something it was never built for. Different industry, different stack, same shape — every time."
roles:
  - company: "NICE"
    period: "2025–2026"
    title: "Senior Software Engineer"
    body:
      - "I joined a platform serving millions of users and spent six months on two different kinds of ownership: the technical kind — multitenant features and a performance fix I pushed through as a proper ADR instead of shipping it quietly — and the people kind, mentoring the junior half of the backend team and building the agentic AI tooling that's now part of how we review code."
      - "The platform is a globally distributed enterprise CX product — legacy PHP and vanilla JavaScript running next to a modern .NET stack, the same \"make the old and the new talk to each other\" problem at a different scale. Working for customers across US and EU jurisdictions meant designing around how their data-protection regimes actually differ, not just checking a compliance box."
    stack: [".NET", "legacy PHP", "vanilla JavaScript", "multi-jurisdiction data protection"]

  - company: "Banco Solidario S.A."
    period: "2023–2025"
    title: "Backend Developer → Solution Architect in practice"
    body:
      - "My title never moved past backend developer, but two years in I was making the calls a solution architect makes — the bank just hadn't updated the paperwork. I joined a team bringing mobile banking in-house, off a vendor product the bank never owned, and ended up responsible for the identity and payments architecture underneath the app hundreds of thousands of people use."
      - "The source of truth was a legacy on-premise core the bank could not move, so every feature crossed a trust boundary, a latency boundary and a compliance boundary at once."
    case_studies:
      - otp-provider-decoupling
      - qr-collections-for-merchants
      - legacy-payment-data-migration
    stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]

  - company: "Mamaya Tech"
    period: "2022–2023"
    title: "Systems Analyst"
    body:
      - "The internal systems team from my previous role spun out into this company, and I went with it. Same problem, different company: integrating satellite ERP systems into an Oracle EBS core, and evaluating the vendors on the other side of those integrations."
      - "The work was the same shape as before the spin-out and the core system was literally the same one — I was integrating satellite systems into it from the other side of a corporate boundary instead of from the inside."
    stack: ["Oracle EBS", "ERP integration", "vendor evaluation"]

  - company: "Avícola Sofía"
    period: "2021–2022"
    title: "Systems Analyst"
    body:
      - "My first real system, end to end: a multitenant attendance platform tying biometric terminals across multiple industrial plants back into the company's Oracle EBS core and HR system, built and shipped while I was still learning what \"production\" actually meant."
      - "An agro-industrial holding running production, cash and warehouse operations on Oracle EBS — instrumented for paperwork, not for the biometric terminals the business needed next. That gap is the one I have been working in ever since."
    case_studies:
      - multi-tenant-biometric-attendance
    stack: ["Oracle EBS", "biometric hardware", "modular monolith"]
---

**Nothing renders this body.** Every element of this page is drawn from the frontmatter above, and this note is the traceability record — the same shape `home.{en,es}.md` took when its prose stopped being rendered.

| Page element | Where it comes from |
|---|---|
| the headline and intro | `h1` and `intro` above |
| each entry's company, years and role | `roles[].company`, `.period`, `.title` |
| each entry's prose | `roles[].body` |
| the case-study rows | `roles[].case_studies` — **slugs**, joined against the route set, so each row's title and href come from that case study's own file in this page's locale |
| the technology line | `roles[].stack` |
| the "most recent" badge | derived from the record's own order, not written anywhere |
| the logo squares | a logo file where one exists; absent is a supported value |
| the availability note and the LinkedIn link | `ui.experience.cv_note` and `.full_history` |