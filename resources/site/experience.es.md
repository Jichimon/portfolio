---
slug: experience
lang: es
type: page
title: "Luis Antelo — Experiencia"
confidentiality: sanitized
h1: "Cada empleador fue distinto. El problema nunca lo fue."
intro: "Un sistema demasiado importante para tocar, y un negocio que necesitaba que hiciera algo para lo que nunca fue pensado. Otra industria, otro stack, la misma forma — siempre."
roles:
  - company: "NICE"
    period: "2025–2026"
    title: "Senior Software Engineer"
    body:
      - "Entré a una plataforma que atiende a millones de usuarios y pasé seis meses en dos tipos de responsabilidad distintos: la técnica —funcionalidades multitenant y una mejora de performance que empujé como ADR en vez de mandarla en silencio— y la de personas, haciendo mentoría a la mitad junior del equipo de backend y construyendo el tooling de IA agéntica que hoy es parte de cómo revisamos código."
      - "La plataforma es un producto CX empresarial distribuido globalmente — PHP legacy y JavaScript vanilla conviviendo con un stack moderno en .NET, el mismo problema de \"hacer que lo viejo y lo nuevo se hablen\", a otra escala. Trabajar para clientes en jurisdicciones de US y EU significó diseñar teniendo en cuenta cómo difieren realmente sus regímenes de protección de datos, no solo tildar un casillero de cumplimiento."
    stack: [".NET", "PHP legacy", "JavaScript vanilla", "protección de datos multi-jurisdicción"]

  - company: "Banco Solidario S.A."
    period: "2023–2025"
    title: "Backend Developer → Solution Architect en la práctica"
    body:
      - "Mi cargo nunca pasó de backend developer, pero a los dos años ya estaba tomando las decisiones que toma un solution architect — al banco simplemente no le actualizaron el papeleo. Entré a un equipo que traía la banca móvil in-house, sacándola de un producto de proveedor del que el banco nunca fue dueño, y terminé a cargo de la arquitectura de identidad y pagos detrás de la app que usan cientos de miles de personas."
      - "La fuente de verdad era un core legacy on-premise que el banco no podía mover, así que cada funcionalidad cruzaba a la vez una frontera de confianza, una de latencia y una de cumplimiento."
    case_studies:
      - otp-provider-decoupling
      - qr-collections-for-merchants
      - legacy-payment-data-migration
    stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]

  - company: "Mamaya Tech"
    period: "2022–2023"
    title: "Analista de Sistemas"
    body:
      - "El equipo de Sistemas de mi rol anterior se independizó como esta empresa, y me fui con ellos. Mismo problema, otra empresa: integrando sistemas ERP satélite a un core de Oracle EBS, y evaluando a los proveedores del otro lado de esas integraciones."
      - "El trabajo tenía la misma forma que antes de la separación y el core era literalmente el mismo — solo que ahora integraba sistemas satélite desde el otro lado de una frontera corporativa en vez de desde adentro."
    stack: ["Oracle EBS", "integración ERP", "evaluación de proveedores"]

  - company: "Avícola Sofía"
    period: "2021–2022"
    title: "Analista de Sistemas"
    body:
      - "Mi primer sistema real, de punta a punta: una plataforma de asistencia multitenant que conectaba terminales biométricas en varias plantas industriales con el core de Oracle EBS y el sistema de RRHH de la empresa, diseñada y llevada a producción mientras todavía estaba aprendiendo qué significaba \"producción\" en serio."
      - "Un holding agroindustrial que llevaba producción, caja y almacenes sobre Oracle EBS — pensado para papeleo, no para las terminales biométricas que el negocio necesitaba después. Ese hueco es en el que vengo trabajando desde entonces."
    case_studies:
      - multi-tenant-biometric-attendance
    stack: ["Oracle EBS", "hardware biométrico", "monolito modular"]
---

**Nada renderiza este cuerpo.** Todos los elementos de esta página salen del frontmatter de arriba, y esta nota es el registro de trazabilidad — la misma forma que tomó `home.{en,es}.md` cuando su prosa dejó de renderizarse.

| Elemento de la página | De dónde sale |
|---|---|
| el titular y la bajada | `h1` e `intro` |
| empresa, años y rol de cada entrada | `roles[].company`, `.period`, `.title` |
| la prosa de cada entrada | `roles[].body` |
| las filas de casos de estudio | `roles[].case_studies` — **slugs**, unidos contra el set de rutas, así el título y el href salen del archivo de ese caso en el idioma de esta página |
| la línea de tecnologías | `roles[].stack` |
| la insignia "más reciente" | derivada del orden del propio registro, no escrita en ningún lado |
| los cuadrados de logo | un archivo de logo donde exista; ausente es un valor soportado |
| la nota de disponibilidad y el link de LinkedIn | `ui.experience.cv_note` y `.full_history` |