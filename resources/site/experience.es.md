---
slug: experience
lang: es
type: page
title: "Luis Octavio Antelo · Experiencia"
confidentiality: sanitized
h1: "El mismo problema tuve que resolver en cada lugar en el que estuve"
intro: "Un sistema construido para una realidad que ya no existía, y un negocio que evolucionó más rápido que él. Otra industria, la misma forma. Una vez más."
roles:
  - company: "NICE"
    period: "2025–2026"
    title: "Senior Software Engineer"
    body:
      - "Entré a una plataforma que atiende a millones de usuarios y pasé seis meses en dos tipos de responsabilidad distintos: la técnica (funcionalidades multitenant y una mejora de performance que empujé como ADR en vez de mandarla en silencio) y la de personas, haciendo mentoría a la mitad junior del equipo de backend y construyendo el tooling de IA agéntica que hoy es parte de cómo revisamos código."
      - "La plataforma es un producto CX empresarial distribuido globalmente: PHP legacy y JavaScript vanilla conviviendo con un stack moderno en .NET, el mismo problema de \"hacer que lo viejo y lo nuevo se hablen\", a otra escala. Trabajar para clientes en jurisdicciones de US y EU significó diseñar teniendo en cuenta cómo difieren realmente sus regímenes de protección de datos, no solo tildar un casillero de cumplimiento."
    stack: [".NET", "PHP legacy", "JavaScript vanilla", "elasticSearch", "AWS", "Jenkins", "RAG", "LLMs", "Snowflake", "Grafana"]

  - company: "Banco Solidario S.A."
    period: "2023–2025"
    title: "Backend Developer → Solution Architect en la práctica"
    body:
      - "Como desarrollador en Banco Solidario S.A., trabajé en la transformación de la banca móvil del banco, llevándola de una solución de proveedor externo a una plataforma propia utilizada por millones de personas. Aunque mi cargo seguía siendo desarrollador, mi scope fue creciendo hasta asumir decisiones propias de arquitectura: diseñé la arquitectura de identidad y pagos, desacoplamos el servicio de OTP que era un punto crítico de dependencia y migré el historial de pagos desde la plataforma legacy sin perder información. También fui el encargado del diseño y desarrollo del módulo de QR Business, una extensión de la aplicación que permite que alguien más realice cobros por vos sin tener cuenta en el banco. Desde cero hasta producción alcanzando más de cien mil usuarios en 3 meses. Implementé transferencias con TOTP y construí APIs y servicios distribuidos utilizando .NET, todo el ecosistema de AWS, RabbitMQ y arquitecturas orientadas a comunicación asíncrona."
    case_studies:
      - otp-provider-decoupling
      - qr-collections-for-merchants
      - legacy-payment-data-migration
    stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "SQL Server", "BIAN", "Flutter"]

  - company: "Mamaya Tech"
    period: "2022–2023"
    title: "Analista de Sistemas"
    body:
      - "El equipo de Sistemas de mi rol anterior se independizó como esta empresa, y me fui con ellos. Mismo problema, otra empresa: integrando soluciones satélites a un ERP, evaluando a los proveedores del otro lado de esas integraciones. También ví plataformas low-code"
      - "El trabajo tenía la misma forma que antes de la separación y el core era literalmente el mismo, solo que ahora integraba sistemas satélite desde el otro lado de una frontera corporativa en vez de desde adentro."
    stack: ["Oracle EBS", "PL/SQL", "integración ERP", "Android", "Angular", ".NET", "low-code", "javascript"]

  - company: "Avícola Sofía"
    period: "2021–2022"
    title: "Trainee → Analista de Sistemas"
    body:
      - "Mi primer sistema real, de punta a punta: una plataforma de asistencia multitenant que conectaba terminales biométricas en varias plantas industriales con el sistema de RRHH de la empresa. El proyecto nació como una mejora a los módulos de integración de HRMS que se utilizaban, reemplazando procesos más limitados por una solución propia, escalable y adaptada a la operación distribuida a nivel nacional. Llevada a producción mientras todavía estaba aprendiendo qué significaba \"producción\" en serio."
      - "También desarrollé integraciones entre los sistemas de producción y Oracle EBS, participando en la evolución de los sistemas que soportaban procesos críticos del negocio. Esa brecha entre lo que el sistema sabía hacer y lo que el negocio necesitaba es en la que vengo trabajando desde entonces."
    case_studies:
      - multi-tenant-biometric-attendance
    stack: ["Oracle EBS", "hardware biométrico", "monolito modular", "Angular", ".NET", "SQL Server", "PL/SQL", "PLCs"]
---

**Nada renderiza este cuerpo.** Todos los elementos de esta página salen del frontmatter de arriba, y esta nota es el registro de trazabilidad, la misma forma que tomó `home.{en,es}.md` cuando su prosa dejó de renderizarse.

| Elemento de la página | De dónde sale |
|---|---|
| el titular y la bajada | `h1` e `intro` |
| empresa, años y rol de cada entrada | `roles[].company`, `.period`, `.title` |
| la prosa de cada entrada | `roles[].body` |
| las filas de casos de estudio | `roles[].case_studies`: **slugs**, unidos contra el set de rutas, así el título y el href salen del archivo de ese caso en el idioma de esta página |
| la línea de tecnologías | `roles[].stack` |
| la insignia "más reciente" | derivada del orden del propio registro, no escrita en ningún lado |
| los cuadrados de logo | un archivo de logo donde exista; ausente es un valor soportado |
| la nota de disponibilidad y el link de LinkedIn | `ui.experience.cv_note` y `.full_history` |